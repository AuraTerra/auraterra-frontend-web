const COLORES_BASE_DIAS = ["#f7fafc", "#edf2f7", "#e2e8f0", "#cbd5e0", "#a0aec0"];

let ROL_DE_SESION_ACTIVO_INTERNO = (typeof window.ROL_DE_SESION_ACTIVO !== 'undefined') ? window.ROL_DE_SESION_ACTIVO : 'agricultor';
let ciudadActualCargada = "Crespo, Entre Ríos, AR";
var URL_BASE_SISTEMA = window.URL_BASE_SISTEMA || "http://localhost/auraterra-backend-api/index.php";

// Registra interacciones para telemetría
async function registrarClickTelemétrico(componente) {
    try {
        const response = await fetch(`${URL_BASE_SISTEMA}?ruta=/registrar_click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `componente=${encodeURIComponent(componente)}`
        });
        if (response.status === 429) {
            window.location.href = `${URL_BASE_SISTEMA}?error_suspension_manual=1`;
        }
    } catch(e) { 
        console.log("Sincronización de telemetría en espera..."); 
    }
}

const OBTENER_PREFIJO_FAV = () => {
    return 'auraterra_favs_' + (typeof window.NOMBRE_DE_USUARIO_SESION !== 'undefined' ? window.NOMBRE_DE_USUARIO_SESION.replace(/[^a-zA-Z0-9]/g, "") : 'global');
};

function obtenerFavoritos() { 
    try { 
        const datosRaw = localStorage.getItem(OBTENER_PREFIJO_FAV());
        if (!datosRaw) return [];
        return JSON.parse(datosRaw) || []; 
    } catch(e) { return []; } 
}

function renderizarMenuFavoritos() {
    const favs = obtenerFavoritos(); 
    const contenedorMenu = document.getElementById('listaFavoritosContent');
    if (!contenedorMenu) return; 
    contenedorMenu.innerHTML = '';
    if (favs.length === 0) { 
        contenedorMenu.innerHTML = '<div style="color:#a0aec0; padding:5px; font-size:0.95rem; font-style:italic;">No hay favoritos guardados</div>'; 
        return; 
    }
    favs.forEach((f, idx) => {
        contenedorMenu.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed #edf2f7; gap:8px;">
                <span onclick="cargarCiudadDesdeFavs('${f.busqueda}')" style="cursor:pointer; font-size:1rem; color:#2b6cb0; font-weight:700; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1;">📍 ${f.alias}</span>
                <div style="display:flex; gap:8px; flex-shrink:0; align-items:center;">
                    <span onclick="event.stopPropagation(); abrirModalEditarFavorito(event, ${idx})" style="cursor:pointer; color:#3182ce; font-weight:bold; font-size:1.1rem; padding: 0 4px;" title="Editar Nombre">✏️</span>
                    <span onclick="eliminarFavoritoIndividual(event, '${f.busqueda}')" style="cursor:pointer; color:#e53e3e; font-weight:bold; font-size:1.1rem; padding: 0 2px;" title="Eliminar">❌</span>
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
        const nuevoNombre = document.getElementById('inputModalEditarAlias').value.trim();
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
    ciudadActualCargada = ciudad; 
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
        return txt.replace(/\b\w/g, l => l.toUpperCase());
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
    const loaderHtml = `<div style="display:flex; padding:25px; justify-content:center; color:#718096; font-style:italic; font-size:1.1rem;">⏳ Sincronizando modelos analíticos y telemetría territorial...</div>`;
    if(document.getElementById('bloqueActual')) document.getElementById('bloqueActual').innerHTML = loaderHtml;
    if(document.getElementById('bloqueExtremas24hCont')) document.getElementById('bloqueExtremas24hCont').innerHTML = loaderHtml;
    if(document.getElementById('bloquePronostico')) document.getElementById('bloquePronostico').innerHTML = loaderHtml;
}

function realizarBusquedaMeteorol() {
    const inputCiudad = document.getElementById('inputCiudad'); if (!inputCiudad) return false;
    const texto = inputCiudad.value.trim();
    if (texto !== "") {
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
    consultarClimaActual(`${URL_BASE_SISTEMA}?ruta=/clima/actual&ciudad=${encodeURIComponent(nombreCiudad)}`); 
    consultarPronostico(`${URL_BASE_SISTEMA}?ruta=/clima/pronostico&ciudad=${encodeURIComponent(nombreCiudad)}`); 
}

// ☀️ CLIMA ACTUAL
async function consultarClimaActual(url) {
    try {
        const response = await fetch(url); 
        if (response.status === 429) { 
            window.location.href = `${URL_BASE_SISTEMA}?error_suspension_manual=1`; 
            return; 
        }
        const res = await response.json(); 
        const clima = res.data;
        const cantFuentes = clima.consenso ? clima.consenso.fuentes_consultadas : 3;

        document.getElementById('bloqueActual').innerHTML = `
            <p style="margin:0; font-weight:800; color:#2d3748; font-size:1.3rem;">📍 ${formatearNombreLocalidad(clima.ubicacion)}</p>
            <div class="temp-principal" style="font-size:5.5rem; font-weight:900; color:#1a202c; display:block; margin:6px 0; line-height:1;">${Math.round(clima.temperatura)}°C</div>
            <p style="text-transform:capitalize; font-weight:800; color:#2d3748; font-size:1.35rem; margin:6px 0;">${clima.descripcion}</p>
            <p style="font-size:1.15rem; color:#4a5568; margin:8px 0 12px 0; font-weight:500;">
                💧 Humedad: <b style="color:#1a202c;">${clima.humedad}%</b> | 💨 Viento: <b style="color:#1a202c;">${clima.viento_kmh || Math.round(clima.viento * 3.6)} km/h</b> (${clima.viento} m/s)
            </p>
            <div style="display:inline-block; padding:7px 14px; background:#ebf8ff; border:1.5px solid #bee3f8; border-radius:20px; font-size:0.95rem; color:#2b6cb0; font-weight:700;">
                ⚡ Consenso Meteorológico Activo: ${cantFuentes} APIs (OpenWeather + WeatherAPI + Tomorrow.io)
            </div>`;
    } catch(e) { 
        console.log("Hilo de clima actual en espera de sesión..."); 
    }
}

// 📅 PRONÓSTICO EXTENDIDO (AGRUPACIÓN EXACTA SIN DÍAS REPETIDOS)
async function consultarPronostico(url) {
    try {
        const response = await fetch(url); 
        if (response.status === 429) { 
            window.location.href = `${URL_BASE_SISTEMA}?error_suspension_manual=1`; 
            return; 
        }
        const res = await response.json(); 
        const lista = res.data;
        
        const locMinuscula = ciudadActualCargada.toLowerCase();
        const esArgentina = locMinuscula.includes("ar") || locMinuscula.includes("argentina");
        const esEntreRios = locMinuscula.includes("entre ríos") || locMinuscula.includes("entre rios");

        if (!res.ok || !Array.isArray(lista) || lista.length === 0) {
            document.getElementById('bloqueExtremas24hCont').innerHTML = `
                <div style="padding:10px 0;">
                    <p style="margin:0 0 6px 0; font-size:1.15rem; color:#c53030; font-weight:700;">⚠️ Pronóstico horario no disponible</p>
                    <p style="font-size:1rem; color:#4a5568; margin:0; line-height:1.4;">
                        No se encontraron registros extendidos para este término. Para ver las 24hs completas, ingresá una ciudad cabecera específica (por ejemplo: <b>Ushuaia, Tierra Del Fuego, AR</b> o <b>Río Grande, Tierra Del Fuego, AR</b>).
                    </p>
                </div>`;
            
            document.getElementById('bloquePronostico').innerHTML = `
                <p style="grid-column: span 5; text-align:center; color:#718096; padding:25px; font-size:1.1rem;">
                    📍 Búsqueda provincial general. Para desplegar la cuadrícula de los 5 días, especificá la ciudad cabecera en el buscador.
                </p>`;
            
            document.getElementById('bloqueAlertas').innerHTML = `
                <div class="tip-item-premium" style="background:#f7fafc; padding:16px; border-radius:10px; border-left:6px solid #718096;">
                    <h4 style="color:#2d3748; margin:0 0 6px 0; font-size:1.3rem;">ℹ️ Monitoreo Territorial en Espera</h4>
                    <p style="margin:0; color:#4a5568; font-size:1.15rem;">Ingrese una localidad puntual para el análisis de riesgo a 72hs.</p>
                </div>`;
            return;
        }

        let tempMax = -999; let tempMin = 999; let vientoMax = 0;
        lista.slice(0, 8).forEach(b => { 
            if(b.main.temp > tempMax) tempMax = b.main.temp; 
            if(b.main.temp < tempMin) tempMin = b.main.temp; 
            if(b.wind.speed > vientoMax) vientoMax = b.wind.speed; 
        });
        const vKmh = Math.round(vientoMax * 3.6);
        
        document.getElementById('bloqueExtremas24hCont').innerHTML = `
            <p style="margin:8px 0; font-size:1.25rem;">🔺 Proyección Máxima: <b style="color:#c53030;">${Math.round(tempMax)}°C</b></p>
            <p style="margin:8px 0; font-size:1.25rem;">🔻 Proyección Mínima: <b style="color:#2b6cb0;">${Math.round(tempMin)}°C</b></p>
            <p style="margin:8px 0; font-size:1.2rem; color:#4a5568;">💨 Magnitud Ráfagas: <b style="color:#1a202c;">${vKmh} km/h</b></p>`;
            
        const bLegal = document.getElementById('bloqueLegalFumigacion'); 
        let htmlAlertasUnificadas = "";

        if (ROL_DE_SESION_ACTIVO_INTERNO === 'planificador') {
            document.getElementById('tituloDinamicoLegal').innerText = "⛺ Seguridad Estructural de Carpas";
            bLegal.innerHTML = vKmh > 18 
                ? "<span style='color:#e53e3e; font-weight:bold; font-size:1.2rem;'>🚫 RÁFAGAS ALARMANTES. Peligro estructural de montajes al aire libre.</span>" 
                : "<span style='color:#27ae60; font-weight:bold; font-size:1.2rem;'>✅ VIENTOS CONTROLADOS: Estructuras seguras bajo resguardo perimetral.</span>";
            
            htmlAlertasUnificadas += `
                <div class="tip-item-premium" style="background:#ebf8ff; padding:16px; border-radius:10px; border-left:6px solid #3182ce; margin-bottom:12px;">
                    <h4 style="color:#2b6cb0; margin:0 0 6px 0; font-size:1.3rem;">💧 Alerta de Punto de Rocío y Condensación</h4>
                    <p style="margin:0; color:#2c5282; font-size:1.15rem; line-height:1.5;">Riesgo alto de humedad superficial nocturna en recubrimientos. Se aconseja el resguardo preventivo de equipos de audio y cableados descubiertos.</p>
                </div>`;
        } else {
            if (esEntreRios) {
                document.getElementById('tituloDinamicoLegal').innerText = "⚖️ Marco Legal: Ley Provincial Nº 6.599 (Entre Ríos)";
                bLegal.innerHTML = (vKmh >= 7 && vKmh <= 15) 
                    ? "<span style='color:#27ae60; font-weight:bold; font-size:1.2rem;'>✅ PULVERIZACIÓN PERMITIDA: Dentro del umbral entrerriano reglamentario (7 a 15 km/h).</span>" 
                    : "<span style='color:#e53e3e; font-weight:bold; font-size:1.2rem;'>🚫 PULVERIZACIÓN SUSPENDIDA: Fuera de la banda legal entrerriana (7 a 15 km/h) por riesgo de deriva o inversión térmica.</span>";
            } else if (esArgentina) {
                document.getElementById('tituloDinamicoLegal').innerText = "🌾 Estándar Agrícola: Guía de Buenas Prácticas (INTA / BPA)";
                if (vKmh >= 5 && vKmh <= 12) {
                    bLegal.innerHTML = "<span style='color:#27ae60; font-weight:bold; font-size:1.2rem;'>✅ CONDICIONES ÓPTIMAS: Dentro de la ventana recomendada por BPA (5 a 12 km/h).</span>";
                } else if (vKmh < 5) {
                    bLegal.innerHTML = "<span style='color:#dd6b20; font-weight:bold; font-size:1.2rem;'>⚠️ PRECAUCIÓN: Viento menor a 5 km/h. Riesgo de inversión térmica y suspensión de gotas.</span>";
                } else {
                    bLegal.innerHTML = "<span style='color:#e53e3e; font-weight:bold; font-size:1.2rem;'>🚫 PULVERIZACIÓN NO RECOMENDADA: Supera los 12 km/h sugeridos por BPA. Alto riesgo de deriva.</span>";
                }
            } else {
                document.getElementById('tituloDinamicoLegal').innerText = "🌐 Protocolo Internacional Estándar";
                bLegal.innerHTML = (vKmh <= 15)
                    ? "<span style='color:#27ae60; font-weight:bold; font-size:1.2rem;'>✅ VIENTOS FAVORABLES: Velocidad inferior a 15 km/h conforme a lineamientos de la FAO.</span>"
                    : "<span style='color:#e53e3e; font-weight:bold; font-size:1.2rem;'>🚫 VIENTO EXCESIVO: Ráfagas superiores a 15 km/h no aptas para pulverización internacional.</span>";
            }
            
            htmlAlertasUnificadas += `
                <div class="tip-item-premium" style="background:#f7fafc; padding:16px; border-radius:10px; border-left:6px solid #4a5568; margin-bottom:12px;">
                    <h4 style="color:#2d3748; margin:0 0 6px 0; font-size:1.3rem;">🪲 Alerta Sanitaria de Acopio Colectivo</h4>
                    <p style="margin:0; color:#4a5568; font-size:1.15rem; line-height:1.5;"><b>Riesgo de Gorgojos:</b> Nivel bajo general en silos. Se aconseja forzar aireación por 4hs nocturnas.</p>
                </div>`;
        }

        if (vKmh > 15) {
            htmlAlertasUnificadas += `<div class="tip-item-premium" style="background:#fffaf0; padding:16px; border-radius:10px; border-left:6px solid #dd6b20;"><h4 style="color:#9c4221; margin:0 0 6px 0; font-size:1.3rem;">⚠️ Alerta por Inestabilidad Atmosférica</h4><p style="margin:0; color:#744210; font-size:1.15rem; line-height:1.5;">Se proyectan ráfagas de viento inestables superiores a los límites estándar regionales.</p></div>`;
        } else {
            htmlAlertasUnificadas += `<div class="tip-item-premium" style="background:#f0fff4; padding:16px; border-radius:10px; border-left:6px solid #27ae60;"><h4 style="color:#22543d; margin:0 0 6px 0; font-size:1.3rem;">☀️ Ventana Operativa Libre de Riesgos</h4><p style="margin:0; color:#1a4731; font-size:1.15rem; line-height:1.5;">Condiciones excelentes para actividades territoriales de precisión para las próximas 72hs.</p></div>`;
        }
        document.getElementById('bloqueAlertas').innerHTML = htmlAlertasUnificadas;

        // MÓDULO OPERATIVO / AGRONÓMICO
        const bFiltro = document.getElementById('bloqueFiltroDinamicoRol');
        if (ROL_DE_SESION_ACTIVO_INTERNO === 'planificador') {
            document.getElementById('tituloFiltroDinamicoRol').innerText = "🎪 Planificación Operativa AuraEvents";
            bFiltro.innerHTML = `
                <div style="color:#4a5568; font-size:1.15rem; line-height:1.6;">
                    <div class="tip-item-premium" style="margin-bottom:8px;"><b>📸 Logística Lumínica:</b> Ventana de Hora Dorada ideal para filmaciones aéreas y capturas exteriores proyectada a las 17:15 hs.</div>
                    <div class="tip-item-premium" style="margin-bottom:8px;"><b>🌡️ Curva de Confort:</b> Curvas térmicas estables. No se requiere pre-encendido de calefacción forzada en carpas.</div>
                    <div class="tip-item-premium" style="margin-bottom:8px;"><b>📐 Rigidez de Sujeciones:</b> Magnitud de vientos moderada. Utilice anclajes estándar; suspenda el despliegue de cartelería vertical o banners a más de 4 metros de altura para evitar resistencia de vela.</div>
                    <div class="tip-item-premium" style="color:#2b6cb0; font-weight:700; background:#ebf8ff; padding:12px; border-radius:8px; margin-top:10px;">💡 Tip Diferencial: Realizar las pruebas acústicas de sonido antes del cambio rotativo perimetral del viento previsto para la noche.</div>
                </div>`;
        } else {
            document.getElementById('tituloFiltroDinamicoRol').innerText = "🌱 Planificación Agronómica Territorial";

            const fechaAhora = new Date();
            const fechaFormateada = fechaAhora.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
            const horaFormateada = fechaAhora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const mesActual = fechaAhora.getMonth();

            let htmlSugerenciaAgro = `
                <div style="background:#edf2f7; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:0.95rem; color:#4a5568;">
                    📅 <b>Informe generado para:</b> ${formatearNombreLocalidad(ciudadActualCargada)} el ${fechaFormateada} a las ${horaFormateada} hs.
                </div>`;

            if (!esArgentina) {
                htmlSugerenciaAgro += `
                    <div style="color:#4a5568; font-size:1.15rem; line-height:1.6;">
                        <div class="tip-item-premium" style="background:#fffaf0; border-left:6px solid #dd6b20; padding:14px; border-radius:8px; margin-bottom:10px;">
                            <b style="color:#c05621;">🌍 Alerta Territorial Internacional:</b> La localidad consultada se encuentra fuera de la República Argentina. 
                            <p style="margin:6px 0 0 0; font-size:1.05rem; color:#744210;">
                                Los modelos de fenología de cultivos del <b>INTA y la Guía BPA</b> no aplican directamente a este suelo ni a este régimen climático/estacional. <b>No se recomienda iniciar labores de siembra sin una validación agronómica local</b> de la región correspondiente.
                            </p>
                        </div>
                        <div class="tip-item-premium" style="margin-bottom:8px;">
                            <b>🧭 Pautas Universales:</b> Verifique la temperatura de la capa arable (>10-12°C para cereales de verano) y evite la aplicación de agroquímicos con vientos superiores a 15 km/h o humedad relativa menor al 40%.
                        </div>
                    </div>`;
            } else {
                if (mesActual >= 8 && mesActual <= 11) {
                    htmlSugerenciaAgro += `
                        <div style="color:#4a5568; font-size:1.15rem; line-height:1.6;">
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🚜 Campaña Gruesa (Primavera/Verano):</b> Ventana óptima para la implantación de cultivos de verano. Suelos con temperatura adecuada en los primeros 5 cm.
                            </div>
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🌱 Especies y Variedades Recomendadas:</b>
                                <ul style="margin:4px 0 0 0; padding-left:20px;">
                                    <li><b>Maíz Temprano:</b> Híbridos de alto potencial con eventos biotecnológicos (VT Triple Pro / Viptera 3). Siembra recomendada entre septiembre y octubre.</li>
                                    <li><b>Soja de 1ª:</b> Grupos de Madurez IV Medio a V Corto (ideales para Entre Ríos, Santa Fe y Córdoba). Apertura de ventana a mediados de octubre.</li>
                                    <li><b>Girasol:</b> Excelente alternativa para lotes con menor retención hídrica o vertisoles con pendientes.</li>
                                    <li><b>Sorgo Granífero:</b> Excelente opción para rotación y aporte de rastrojo en suelos pesados de Entre Ríos.</li>
                                </ul>
                            </div>
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🛡 Manejo Sanitario:</b> Monitorear nacimiento de malezas de primavera (rama negra y yuyo colorado). Aplicar preemergentes aprovechando la humedad actual.
                            </div>
                            <div class="tip-item-premium" style="color:#2f855a; font-weight:700; background:#f0fff4; padding:12px; border-radius:8px; margin-top:10px;">
                                💡 Tip Diferencial: Calibrar la profundidad del cuerpo de siembra a 4-5 cm para asegurar contacto semilla-humedad sin provocar encostramiento.
                            </div>
                        </div>`;
                } else if (mesActual >= 4 && mesActual <= 7) {
                    htmlSugerenciaAgro += `
                        <div style="color:#4a5568; font-size:1.15rem; line-height:1.6;">
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🚜 Campaña Fina (Otoño/Invierno):</b> Capacidad de campo en rango adecuado para cereales de invierno y legumbres.
                            </div>
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🌱 Especies y Variedades Recomendadas:</b>
                                <ul style="margin:4px 0 0 0; padding-left:20px;">
                                    <li><b>Trigo Pan (Ciclo Largo):</b> Ideal para siembras de mayo y principios de junio para aprovechar el fotoperíodo.</li>
                                    <li><b>Trigo Pan (Ciclo Corto / Intermedio):</b> Para implantaciones de julio y agosto, reduciendo la exposición a heladas tardías.</li>
                                    <li><b>Cebada Cervecera:</b> Permite una cosecha anticipada que libera el lote temprano hacia soja de segunda.</li>
                                    <li><b>Arveja y Vicia Villosa:</b> Cultivos de cobertura y renta para fijación biológica de nitrógeno y control biológico de malezas.</li>
                                    <li><b>Colza / Canola:</b> Buena alternativa para diversificación invernal en suelos bien drenados.</li>
                                </ul>
                            </div>
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🧪 Nutrición:</b> Ventana adecuada para refertilización nitrogenada en macollaje (urea incorporada o líquidos UAN) con suelo húmedo.
                            </div>
                            <div class="tip-item-premium" style="color:#2f855a; font-weight:700; background:#f0fff4; padding:12px; border-radius:8px; margin-top:10px;">
                                💡 Tip Diferencial: Evitar el tránsito pesado en cabeceras de lotes húmedos para mitigar la compactación subsuperficial en vertisoles entrerrianos.
                            </div>
                        </div>`;
                } else {
                    htmlSugerenciaAgro += `
                        <div style="color:#4a5568; font-size:1.15rem; line-height:1.6;">
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🚜 Verano Tardío / Post-Cosecha:</b> Etapa de definición de rendimientos en siembras tardías y planificación otoñal.
                            </div>
                            <div class="tip-item-premium" style="margin-bottom:8px;">
                                <b>🌱 Opciones Operativas y Manejo:</b>
                                <ul style="margin:4px 0 0 0; padding-left:20px;">
                                    <li><b>Seguimiento de Soja de 2ª y Maíz Tardío:</b> Monitoreo de oruga cogollera, chinches y enfermedades de fin de ciclo.</li>
                                    <li><b>Cultivos de Servicio (Avena / Centeno):</b> Planificación de siembras al voleo sobre maíz en pie para generar cobertura invernal inmediata.</li>
                                    <li><b>Pasturas Consociadas:</b> Implantación de alfalfa y gramíneas para planteos mixtos ganadero-agrícolas.</li>
                                </ul>
                            </div>
                            <div class="tip-item-premium" style="color:#2f855a; font-weight:700; background:#f0fff4; padding:12px; border-radius:8px; margin-top:10px;">
                                💡 Tip Diferencial: Medir agua útil en el perfil antes de definir barbechos químicos para asegurar reservas hacia la próxima campaña fina.
                            </div>
                        </div>`;
                }
            }

            bFiltro.innerHTML = htmlSugerenciaAgro;
        }
        
        // 🛠️ AGRUPACIÓN ESTRICTA POR FECHA LOCAL (Elimina la duplicación de días)
        const bPron = document.getElementById('bloquePronostico'); 
        bPron.innerHTML = ''; 
        let mapa = {}; 
        
        lista.forEach(i => { 
            // Convertimos el timestamp a la fecha local del navegador
            const dLocal = new Date(i.dt * 1000);
            const anio = dLocal.getFullYear();
            const mes = String(dLocal.getMonth() + 1).padStart(2, '0');
            const dia = String(dLocal.getDate()).padStart(2, '0');
            const claveDiaLocal = `${anio}-${mes}-${dia}`;

            if(!mapa[claveDiaLocal]) mapa[claveDiaLocal] = []; 
            mapa[claveDiaLocal].push(i); 
        });

        // Tomamos los primeros 5 días únicos
        const diasUnicos = Object.keys(mapa).slice(0, 5);

        diasUnicos.forEach((claveDia, idx) => {
            const primerItem = mapa[claveDia][0];
            const dateObj = new Date(primerItem.dt * 1000);
            const tituloDia = dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });

            let html = `
                <div class="columna-dia-vertical" style="background:${COLORES_BASE_DIAS[idx]}; padding:12px; border-radius:12px; border:1px solid #cbd5e0;">
                    <h4 class="titulo-dia-vertical" style="margin:0 0 12px 0; text-align:center; color:#1a202c; text-transform:capitalize; font-size:1.25rem; font-weight:800;">
                        ${tituloDia}
                    </h4>
                    <div style="max-height: 380px; overflow-y: auto; padding-right: 4px;">`;
            
            mapa[claveDia].forEach(h => {
                let desc = h.weather[0].description.toLowerCase();
                let bg = (desc.includes("claro") || desc.includes("despejado")) ? "#fef3c7" : "#ffffff";
                
                // Formateamos la hora local exacta
                const dHora = new Date(h.dt * 1000);
                const horaStr = dHora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

                html += `
                    <div class="tarjeta-hora-interna" style="background:${bg}; border:1px solid #e2e8f0; margin-bottom:10px; padding:10px 12px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.04);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.95rem; color:#4a5568; font-weight:700;">🕒 ${horaStr} hs</span>
                            <b style="font-size:1.4rem; color:#1a202c;">${Math.round(h.main.temp)}°C</b>
                        </div>
                        <div style="font-size:1rem; text-transform:capitalize; color:#2d3748; font-weight:600; margin-top:4px;">
                            ${h.weather[0].description}
                        </div>
                        <div style="font-size:0.9rem; color:#4a5568; margin-top:4px; font-weight:500;">
                            💨 ${Math.round(h.wind.speed * 3.6)} km/h | 💧 ${h.main.humidity}%
                        </div>
                    </div>`;
            });
            html += `</div></div>`; 
            bPron.innerHTML += html;
        });

        actualizarEstrellaFavorito(ciudadActualCargada);
    } catch(e) { 
        console.log("Procesamiento pasivo de tendencias extendidas."); 
    }
}

function activarGeolocalizacionGPS() {
    registrarClickTelemétrico("Activó Localización por Hardware GPS");
    if (navigator.geolocation) {
        lanzarToast("🛰️ Conectando con hardware GPS...");
        mostrarEfectoCargandoDatos();
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude.toFixed(4); 
            const lon = position.coords.longitude.toFixed(4);
            document.getElementById('coordenadasActuales').innerHTML = `Hardware Fijo: <b>Lat:</b> ${lat} | <b>Lon:</b> ${lon}`;
            consultarClimaActual(`${URL_BASE_SISTEMA}?ruta=/clima/actual&lat=${lat}&lon=${lon}`);
            consultarPronostico(`${URL_BASE_SISTEMA}?ruta=/clima/pronostico&lat=${lat}&lon=${lon}`);
        }, () => {
            lanzarToast("⚠️ Permiso no concedido. Cargando Crespo por defecto.");
            ejecutarConsultasPorNombre(ciudadActualCargada);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    enclavarEscuchaTecladoEnter();
    renderizarMenuFavoritos();
    
    document.getElementById('btnBuscar').addEventListener('click', realizarBusquedaMeteorol);
    document.getElementById('btnFav').addEventListener('click', toggleFavorito);
    
    const btnGps = document.getElementById('btnGps');
    if (btnGps) { btnGps.addEventListener('click', activarGeolocalizacionGPS); }

    const btnCerrarModalError = document.getElementById('btnCerrarModalError');
    const btnConfirmarEditarAlias = document.getElementById('btnConfirmarEditarAlias');
    if (btnConfirmarEditarAlias) { btnConfirmarEditarAlias.addEventListener('click', guardarEdicionFavorito); }

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

    if (btnCerrarModalError) { 
        btnCerrarModalError.addEventListener('click', () => { 
            document.getElementById('modalErrorBuscador').classList.remove('show'); 
        }); 
    }
    
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
    if (btnCerrarInfo && modalInfo) { 
        btnCerrarInfo.addEventListener('click', () => { 
            modalInfo.classList.remove('show'); 
        }); 
    }
    
    document.getElementById('btnCancelarAlias').addEventListener('click', () => { 
        document.getElementById('modalAgregarAliasFav').classList.remove('show'); 
    });
    
    document.getElementById('btnConfirmarAlias').addEventListener('click', () => {
        let favs = obtenerFavoritos(); 
        const val = document.getElementById('inputModalAlias').value.trim();
        if(val) { 
            favs.push({alias: val, busqueda: ciudadActualCargada}); 
            localStorage.setItem(OBTENER_PREFIJO_FAV(), JSON.stringify(favs)); 
            lanzarToast("⭐ Marcador guardado con éxito"); 
        }
        document.getElementById('modalAgregarAliasFav').classList.remove('show'); 
        renderizarMenuFavoritos(); 
        actualizarEstrellaFavorito(ciudadActualCargada);
    });

    ejecutarConsultasPorNombre(ciudadActualCargada);
});