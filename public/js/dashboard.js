const COLORES_BASE_DIAS = ["#f7fafc", "#edf2f7", "#e2e8f0", "#cbd5e0", "#a0aec0"];

let ROL_DE_SESION_ACTIVO_INTERNO = (typeof ROL_DE_SESION_ACTIVO !== 'undefined') ? ROL_DE_SESION_ACTIVO : 'agricultor'; //evalua si eciste y sino lo pone como agricultor
let ciudadActualCargada = "Crespo, Entre Ríos, AR";
const URL_BASE_SISTEMA = (typeof BASE_URL_PROYECTO !== 'undefined') ? BASE_URL_PROYECTO : '/auraTerraMayo'; //concatena el host actual con la ruta de auraterramayo

//Registra las interacciones del operador y gestiona el desvío automático si salta el Anti-Bot
async function registrarClickTelemétrico(componente) {
    try {
        const response = await fetch(`${URL_BASE_SISTEMA}/registrar_click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `componente=${encodeURIComponent(componente)}`
        });
        if (response.status === 429) {
            window.location.href = `${URL_BASE_SISTEMA}/index.php?error_suspension_manual=1`;
        }
    } catch(e) { 
        console.log("Sincronización de telemetría en espera..."); 
    }
}

const OBTENER_PREFIJO_FAV = () => {
    return 'auraterra_favs_' + (typeof NOMBRE_DE_USUARIO_SESION !== 'undefined' ? NOMBRE_DE_USUARIO_SESION.replace(/[^a-zA-Z0-9]/g, "") : 'global');
};

function obtenerFavoritos() { 
    try { 
        const datosRaw = localStorage.getItem(OBTENER_PREFIJO_FAV()); //alm texto plano 
        if (!datosRaw) return [];
        return JSON.parse(datosRaw) || []; 
    } catch(e) { return []; } 
}

//Renderiza el desplegable de marcadores con el stopPropagation en el lápiz
function renderizarMenuFavoritos() {
    const favs = obtenerFavoritos(); 
    const contenedorMenu = document.getElementById('listaFavoritosContent');
    if (!contenedorMenu) return; 
    contenedorMenu.innerHTML = '';
    if (favs.length === 0) { 
        contenedorMenu.innerHTML = '<div style="color:#a0aec0; padding:5px; font-size:0.85rem; font-style:italic;">No hay favoritos</div>'; 
        return; 
    }
    //Recorre el objeto de la ciudad (f) y su número de posición de índice (idx).
    favs.forEach((f, idx) => {
        contenedorMenu.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px dashed #edf2f7; gap:8px;">
                <span onclick="cargarCiudadDesdeFavs('${f.busqueda}')" style="cursor:pointer; font-size:0.9rem; color:#2b6cb0; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1;">📍 ${f.alias}</span>
                <div style="display:flex; gap:8px; flex-shrink:0; align-items:center;">
                    <span onclick="event.stopPropagation(); abrirModalEditarFavorito(event, ${idx})" style="cursor:pointer; color:#3182ce; font-weight:bold; font-size:0.95rem; padding: 0 4px;" title="Editar Nombre">✏️</span>
                    <span onclick="eliminarFavoritoIndividual(event, '${f.busqueda}')" style="cursor:pointer; color:#e53e3e; font-weight:bold; padding:0 2px;">❌</span>
                </div>
            </div>`;
    });
}

let indiceFavoritoAEditarGlobal = null; 
function abrirModalEditarFavorito(event, index) {
    const favs = obtenerFavoritos();
    if (favs[index]) {
        indiceFavoritoAEditarGlobal = index; 
        document.getElementById('inputModalEditarAlias').value = favs[index].alias;
        document.getElementById('modalEditarAliasFav').classList.add('show'); 
    }
}

function guardarEdicionFavorito() {
    if (indiceFavoritoAEditarGlobal !== null) {
        let favs = obtenerFavoritos();
        const nuevoNombre = document.getElementById('inputModalEditarAlias').value.trim(); //elimina todos los espacios en blanco
        if (nuevoNombre) {
            favs[indiceFavoritoAEditarGlobal].alias = nuevoNombre;
            localStorage.setItem(OBTENER_PREFIJO_FAV(), JSON.stringify(favs)); 
            lanzarToast("📝 Marcador actualizado con éxito");
        }
        document.getElementById('modalEditarAliasFav').classList.remove('show');
        indiceFavoritoAEditarGlobal = null;
        renderizarMenuFavoritos();
    }
}

function toggleFavorito() {
    let favs = obtenerFavoritos(); 
    const index = favs.findIndex(f => f.busqueda.toLowerCase() === ciudadActualCargada.toLowerCase());
    if (index > -1) {
        favs.splice(index, 1); 
        localStorage.setItem(OBTENER_PREFIJO_FAV(), JSON.stringify(favs));
        actualizarEstrellaFavorito(ciudadActualCargada); 
        renderizarMenuFavoritos();
        lanzarToast("⭐ Marcador removido de favoritos");
    } else {
        document.getElementById('inputModalAlias').value = formatearNombreLocalidad(ciudadActualCargada);
        document.getElementById('modalAgregarAliasFav').classList.add('show');
    }
}

function cargarCiudadDesdeFavs(ciudad) { 
    ciudadActualCargada = city = ciudad; 
    document.getElementById('inputCiudad').value = formatearNombreLocalidad(ciudad); 
    registrarClickTelemétrico(`Buscó Ciudad: ${ciudad}`); 
    ejecutarConsultasPorNombre(ciudad); 
} 

function eliminarFavoritoIndividual(event, ciudad) { 
    event.stopPropagation(); 
    let favs = obtenerFavoritos().filter(f => f.busqueda.toLowerCase() !== ciudad.toLowerCase()); 
    localStorage.setItem(OBTENER_PREFIJO_FAV(), JSON.stringify(favs)); 
    renderizarMenuFavoritos(); 
    actualizarEstrellaFavorito(ciudadActualCargada); 
}

function actualizarEstrellaFavorito(ciudad) {
    const btnFav = document.getElementById('btnFav'); if (!btnFav) return;
    const existe = obtenerFavoritos().some(f => f.busqueda && f.busqueda.toLowerCase() === ciudad.toLowerCase());
    btnFav.style.color = existe ? '#f59e0b' : '#cbd5e0';
}

function formatearNombreLocalidad(cadena) {
    if (!cadena) return "";
    let partes = cadena.split(',');
    let mapeado = partes.map((p, i, a) => {
        let txt = p.trim().toLowerCase();
        if (i === a.length - 1 && txt.length <= 3) return txt.toUpperCase();
        return txt.replace(/\b\w/g, l => l.toUpperCase()); //convierte la primera letra en mayúscula
    });
    if (mapeado.length === 3 && mapeado[0] === "Paraná" && mapeado[1] === "Paraná") {
        mapeado[1] = "Entre Ríos";
    }
    return mapeado.join(', ');
}

function lanzarToast(mensaje) {
    const toast = document.getElementById('toastApp'); if (!toast) return;
    toast.innerText = mensaje; toast.style.display = 'block'; 
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function mostrarEfectoCargandoDatos() {
    const loaderHtml = `<div style="display:flex; padding:25px; justify-content:center; color:#718096; font-style:italic;">⏳ Sincronizando modelos analíticos y telemetría territorial...</div>`;
    if(document.getElementById('bloqueActual')) document.getElementById('bloqueActual').innerHTML = loaderHtml;
    if(document.getElementById('bloqueExtremas24hCont')) document.getElementById('bloqueExtremas24hCont').innerHTML = loaderHtml;
    if(document.getElementById('bloquePronostico')) document.getElementById('bloquePronostico').innerHTML = loaderHtml;
}

function realizarBusquedaMeteorol() {
    const inputCiudad = document.getElementById('inputCiudad'); if (!inputCiudad) return false;
    const texto = inputCiudad.value.trim();
    if (texto !== "") {
        // Validation perimetral de los tres términos obligatorios
        if (texto.split(',').length !== 3) { 
            document.getElementById('modalErrorBuscador').classList.add('show'); 
            return false; 
        }
        ciudadActualCargada = texto; 
        mostrarEfectoCargandoDatos();
        registrarClickTelemétrico(`Buscó Ciudad: ${texto}`); 
        ejecutarConsultasPorNombre(texto);
        return true;
    }
    return false;
}

function enclavarEscuchaTecladoEnter() {
    const inputCiudad = document.getElementById('inputCiudad');
    if (inputCiudad) {
        inputCiudad.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                realizarBusquedaMeteorol();
            }
        });
    }
}

function ejecutarConsultasPorNombre(nombreCiudad) { 
    consultarClimaActual(`${URL_BASE_SISTEMA}/clima/actual?ciudad=${encodeURIComponent(nombreCiudad)}`); 
    consultarPronostico(`${URL_BASE_SISTEMA}/clima/pronostico?ciudad=${encodeURIComponent(nombreCiudad)}`); 
}

async function consultarClimaActual(url) {
    try {
        const response = await fetch(url); 
        if (response.status === 429) { window.location.href = `${URL_BASE_SISTEMA}/index.php?error_suspension_manual=1`; return; }
        const res = await response.json(); const clima = res.data; //Deserialización de datos binarios a formato de objeto nativo de JavaScript
        document.getElementById('bloqueActual').innerHTML = `
            <p style="margin:0; font-weight:700; color:#4a5568;">📍 ${formatearNombreLocalidad(clima.ubicacion)}</p>
            <div class="temp-principal" style="font-size:5rem; font-weight:900; color:#1a202c; display:block; margin:5px 0;">${Math.round(clima.temperatura)}°C</div>
            <p style="text-transform:capitalize; font-weight:700; color:#2d3748; margin:2px 0;">${clima.descripcion}</p>
            <p style="font-size:0.9rem; color:#718096; margin:0;">💧 Humedad: ${clima.humedad}% | 💨 Viento: ${clima.viento} m/s</p>`;
    } catch(e){ console.log("Hilo de clima actual en espera de sesión..."); }
}

async function consultarPronostico(url) {
    try {
        const response = await fetch(url);
        if (response.status === 429) { window.location.href = `${URL_BASE_SISTEMA}/index.php?error_suspension_manual=1`; return; }
        const res = await response.json(); const lista = res.data;
        let tempMax = -999; let tempMin = 999; let vientoMax = 0;
        lista.slice(0, 8).forEach(b => { if(b.main.temp > tempMax) tempMax = b.main.temp; if(b.main.temp < tempMin) tempMin = b.main.temp; if(b.wind.speed > vientoMax) vientoMax = b.wind.speed; });
        const vKmh = Math.round(vientoMax * 3.6);
        
        document.getElementById('bloqueExtremas24hCont').innerHTML = `
            <p style="margin:4px 0;">🔺 Proyección Máxima: <b>${Math.round(tempMax)}°C</b></p>
            <p style="margin:4px 0;">🔻 Proyección Mínima: <b>${Math.round(tempMin)}°C</b></p>
            <p style="margin:4px 0; font-size:0.95rem; color:#718096;">💨 Magnitud Ráfagas: ${vKmh} km/h</p>`;
            
        const bLegal = document.getElementById('bloqueLegalFumigacion'); let htmlAlertasUnificadas = "";

        if (ROL_DE_SESION_ACTIVO_INTERNO === 'planificador') {
            document.getElementById('tituloDinamicoLegal').innerText = "⛺ Seguridad Estructural de Carpas";
            bLegal.innerHTML = vKmh > 18 ? "<span style='color:#e53e3e; font-weight:bold;'>🚫 RÁFAGAS ALARMANTES. Peligro estructural de montajes al aire libre.</span>" : "<span style='color:#27ae60; font-weight:bold;'>✅ VIENTOS CONTROLADOS: Estructuras seguras bajo resguardo perimetral.</span>";
            
            htmlAlertasUnificadas += `
                <div class="tip-item-premium" style="background:#ebf8ff; padding:14px; border-radius:8px; border-left:5px solid #3182ce; margin-bottom:10px;">
                    <h4 style="color:#2b6cb0; margin:0 0 6px 0; font-size:1.15rem;">💧 Alerta de Punto de Rocío y Condensación</h4>
                    <p style="margin:0; color:#2c5282; font-size:1.05rem;">Riesgo alto de humedad superficial nocturna en recubrimientos. Se aconseja el resguardo preventivo de equipos de audio y cableados descubiertos.</p>
                </div>`;
        } else {
            document.getElementById('tituloDinamicoLegal').innerText = "⚖️ Marco Legal de Pulverización";
            bLegal.innerHTML = (vKmh >= 7 && vKmh <= 15) ? "<span style='color:#27ae60; font-weight:bold;'>✅ PULVERIZACIÓN PERMITIDA: Dentro de los umbrales de la Ley Provincial.</span>" : "<span style='color:#e53e3e; font-weight:bold;'>🚫 PULVERIZACIÓN SUSPENDIDA: Fuera de la banda reglamentaria por deriva fitosanitaria.</span>";
            
            htmlAlertasUnificadas += `
                <div class="tip-item-premium" style="background:#f7fafc; padding:14px; border-radius:8px; border-left:5px solid #4a5568; margin-bottom:10px;">
                    <h4 style="color:#2d3748; margin:0 0 6px 0; font-size:1.15rem;">🪲 Alerta Sanitaria de Acopio Colectivo</h4>
                    <p style="margin:0; color:#4a5568; font-size:1.05rem;"><b>Riesgo de Gorgojos:</b> Nivel bajo general en silos. Se aconseja forzar aireación por 4hs nocturnas.</p>
                </div>`;
        }

        if (vKmh > 15) {
            htmlAlertasUnificadas += `<div class="tip-item-premium" style="background:#fffaf0; padding:14px; border-radius:8px; border-left:5px solid #dd6b20;"><h4 style="color:#9c4221; margin:0 0 6px 0; font-size:1.15rem;">⚠️ Alerta por Inestabilidad Atmosférica</h4><p style="margin:0; color:#744210; font-size:1.05rem;">Se proyectan ráfagas de viento inestables superiores a los límites estándar regionales.</p></div>`;
        } else {
            htmlAlertasUnificadas += `<div class="tip-item-premium" style="background:#f0fff4; padding:14px; border-radius:8px; border-left:5px solid #27ae60;"><h4 style="color:#22543d; margin:0 0 6px 0; font-size:1.15rem;">☀️ Ventana Operativa Libre de Riesgos</h4><p style="margin:0; color:#1a4731; font-size:1.05rem;">Condiciones excelentes para actividades territoriales de precisión para las próximas 72hs.</p></div>`;
        }
        document.getElementById('bloqueAlertas').innerHTML = htmlAlertasUnificadas;

        const bFiltro = document.getElementById('bloqueFiltroDinamicoRol');
        if (ROL_DE_SESION_ACTIVO_INTERNO === 'planificador') {
            document.getElementById('tituloFiltroDinamicoRol').innerText = "🎪 Planificación Operativa AuraEvents";
            bFiltro.innerHTML = `
                <div style="color:#4a5568;">
                    <div class="tip-item-premium"><b>📸 Logística Lumínica:</b> Ventana de Hora Dorada ideal para filmaciones aéreas y capturas exteriores proyectada a las 17:15 hs.</div>
                    <div class="tip-item-premium"><b>🌡️ Curva de Confort:</b> Curvas térmicas estables. No se requiere pre-encendido de calefacción forzada en carpas.</div>
                    <div class="tip-item-premium"><b>📐 Rigidez de Sujeciones:</b> Magnitud de vientos moderada. Utilice anclajes estándar; suspenda el despliegue de cartelería vertical o banners a más de 4 metros de altura para evitar resistencia de vela.</div>
                    <div class="tip-item-premium" style="color:#2b6cb0; font-weight:700; background:#ebf8ff; padding:10px; border-radius:8px; margin-top:8px;">💡 Tip Diferencial: Realizar las pruebas acústicas de sonido antes del cambio rotativo perimetral del viento previsto para la noche.</div>
                </div>`;
        } else {
            document.getElementById('tituloFiltroDinamicoRol').innerText = "🌱 Planificación de Cultivo Sugerido";
            bFiltro.innerHTML = `
                <div style="color:#4a5568;">
                    <div class="tip-item-premium"><b>🚜 Ventana de Labor:</b> Capacidad de campo en rango óptimo. Ventana excelente para la implantación inmediata de Trigo (Ciclo Largo / Intermedio).</div>
                    <div class="tip-item-premium"><b>🌱 Variedades y Semillas Recomendadas para Entre Ríos:</b> Para aprovechar el suelo del día de hoy en la región, se sugiere la siembra de **Trigo pan (variedades de ciclo largo)** o la incorporación alternativa de **Arveja** como cultivo de cobertura invernal para fijación biológica de nitrógeno.</div>
                    <div class="tip-item-premium"><b>🛡️ Manejo Sanitario:</b> Alertas de Humedad Relativa propicias para esporulación fúngica. Programe aplicaciones de fungicidas sistémicos en las primeras horas de la mañana.</div>
                    <div class="tip-item-premium"><b>🧪 Nutrición Estructural:</b> Baja tasa de volatilización de nitrógeno por cobertura térmica estable. Ventana ideal para fertilización con urea incorporada.</div>
                    <div class="tip-item-premium" style="color:#2f855a; font-weight:700; background:#f0fff4; padding:10px; border-radius:8px; margin-top:8px;">💡 Tip Diferencial: Evite el tránsito pesado en cabeceras de lotes húmedos para mitigar la compactación subsuperficial del suelo de Entre Ríos.</div>
                </div>`;
        }
        
        const bPron = document.getElementById('bloquePronostico'); bPron.innerHTML = ''; let mapa = {}; 
        lista.forEach(i => { const f = i.dt_txt.split(' ')[0]; if(!mapa[f]) mapa[f] = []; mapa[f].push(i); });
        Object.keys(mapa).slice(0,5).forEach((f, idx) => {
            const dateObj = new Date(mapa[f][0].dt * 1000);
            let html = `<div class="columna-dia-vertical" style="background:${COLORES_BASE_DIAS[idx]};"><h4 class="titulo-dia-vertical">${dateObj.toLocaleDateString('es-AR', {weekday:'long', day:'numeric'})}</h4>`;
            mapa[f].slice(0,4).forEach(h => {
                let bg = (h.weather[0].description.toLowerCase().includes("claro") || h.weather[0].description.toLowerCase().includes("despejado")) ? "#fef3c7" : "#ffffff";
                html += `<div class="tarjeta-hora-interna" style="background:${bg}; border:1px solid #edf2f7; margin-bottom:6px; padding:6px; border-radius:6px;"><span style="font-size:0.75rem; color:#718096; display:block;">🕒 ${h.dt_txt.split(' ')[1].substring(0,5)} hs</span><b style="font-size:1.15rem; display:block; color:#1a202c;">${Math.round(h.main.temp)}°C</b><span style="font-size:0.8rem; text-transform:capitalize;">${h.weather[0].description}</span></div>`;
            });
            html += `</div>`; bPron.innerHTML += html;
        });
        actualizarEstrellaFavorito(ciudadActualCargada);
    } catch(e){ console.log("Procesamiento pasivo de tendencias extendidas."); }
}

function activarGeolocalizacionGPS() {
    registrarClickTelemétrico("Activó Localización por Hardware GPS");
    if (navigator.geolocation) {
        lanzarToast("🛰️ Conectando con hardware GPS perimetral...");
        mostrarEfectoCargandoDatos();
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude.toFixed(4); const lon = position.coords.longitude.toFixed(4);
            document.getElementById('coordenadasActuales').innerHTML = `Hardware Fijo: <b>Lat:</b> ${lat} | <b>Lon:</b> ${lon}`;
            consultarClimaActual(`${URL_BASE_SISTEMA}/clima/actual?lat=${lat}&lon=${lon}`);
            consultarPronostico(`${URL_BASE_SISTEMA}/clima/pronostico?lat=${lat}&lon=${lon}`);
        }, () => {
            lanzarToast("⚠️ Error de hardware. Cargando Crespo por defecto.");
            ejecutarConsultasPorNombre(ciudadActualCargada);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    //garantiza que ninguna función intente hacer clic en un botón que todavía no se terminó de dibujar en la pantalla.
    enclavarEscuchaTecladoEnter();
    renderizarMenuFavoritos();
    
    document.getElementById('btnBuscar').addEventListener('click', realizarBusquedaMeteorol);
    document.getElementById('btnFav').addEventListener('click', toggleFavorito);
    
    const btnGps = document.getElementById('btnGps');
    if (btnGps) { btnGps.addEventListener('click', activarGeolocalizacionGPS); }

    const btnCerrarModalError = document.getElementById('btnCerrarModalError');
    const btnConfirmarEditarAlias = document.getElementById('btnConfirmarEditarAlias');
    if (btnConfirmarEditarAlias) { btnConfirmarEditarAlias.addEventListener('click', guardarEdicionFavorito); }

    // Interceptor dinámico para cerrar modales con la tecla Enter
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const mError = document.getElementById('modalErrorBuscador');
            const mEditar = document.getElementById('modalEditarAliasFav');
            const mAgregar = document.getElementById('modalAgregarAliasFav');
            
            if (mError && mError.classList.contains('show')) {
                event.preventDefault(); btnCerrarModalError.click();
            } else if (mEditar && mEditar.classList.contains('show')) {
                event.preventDefault(); btnConfirmarEditarAlias.click();
            } else if (mAgregar && mAgregar.classList.contains('show')) {
                event.preventDefault(); document.getElementById('btnConfirmarAlias').click();
            }
        }
    });

    if (btnCerrarModalError) { btnCerrarModalError.addEventListener('click', () => { document.getElementById('modalErrorBuscador').classList.remove('show'); }); }
    
    
    const btnLogo = document.getElementById('btnLogoInfo'); 
    const modalInfo = document.getElementById('modalInfoCorporativo'); 
    const btnCerrarInfo = document.getElementById('btnCerrarModalInfo');
    
    if (btnLogo && modalInfo) { 
        btnLogo.addEventListener('click', (e) => { 
            e.preventDefault(); 
            modalInfo.classList.add('show'); 
            registrarClickTelemétrico('Logo - Abrió Información Corporativa'); 
        }); 
    }
    if (btnCerrarInfo && modalInfo) { btnCerrarInfo.addEventListener('click', () => { modalInfo.classList.remove('show'); }); }
    
    document.getElementById('btnCancelarAlias').addEventListener('click', () => { document.getElementById('modalAgregarAliasFav').classList.remove('show'); });
    
    document.getElementById('btnConfirmarAlias').addEventListener('click', () => {
        let favs = obtenerFavoritos(); const val = document.getElementById('inputModalAlias').value.trim();
        if(val) { 
            favs.push({alias: val, busqueda: ciudadActualCargada}); 
            localStorage.setItem(OBTENER_PREFIJO_FAV(), JSON.stringify(favs)); 
            lanzarToast("⭐ Marcador guardado con éxito"); 
        }
        document.getElementById('modalAgregarAliasFav').classList.remove('show'); 
        renderizarMenuFavoritos(); 
        actualizarEstrellaFavorito(ciudadActualCargada);
    });

    // Carga analítica por defecto inicial
    ejecutarConsultasPorNombre(ciudadActualCargada);
});