/**
 * AuraTerra — Dashboard Frontend Engine
 * Autores: Javier Folmer, Soledad Gareis, Tamara Godoy
 */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost/auraterra-backend-api/index.php'
    : '/api/index.php';

let ciudadActual = "Crespo, Entre Ríos, AR";
let coordenadasActuales = { lat: -32.029, lon: -60.306 };
let usuarioActual = null;
let pronosticoCompletoMemoria = [];
let diaSeleccionadoClave = null;

// Normalizador inteligente para geolocalización inversa y búsquedas
function normalizarUbicacionArgentina(rawUbicacion, lat, lon) {
    if (!rawUbicacion) return "Crespo, Entre Ríos, AR";
    const loc = rawUbicacion.toLowerCase().trim();

    // Mapeo de Entre Ríos
    if (loc.includes("crespo") || (lat && lat <= -32.0 && lat >= -32.1 && lon >= -60.4 && lon <= -60.2)) return "Crespo, Entre Ríos, AR";
    if (loc.includes("paraná") || loc.includes("parana")) return "Paraná, Entre Ríos, AR";
    if (loc.includes("concordia")) return "Concordia, Entre Ríos, AR";
    if (loc.includes("gualeguaychú") || loc.includes("gualeguaychu")) return "Gualeguaychú, Entre Ríos, AR";
    if (loc.includes("diamante")) return "Diamante, Entre Ríos, AR";
    if (loc.includes("victoria")) return "Victoria, Entre Ríos, AR";
    if (loc.includes("villaguay")) return "Villaguay, Entre Ríos, AR";
    if (loc.includes("chajarí") || loc.includes("chajari")) return "Chajarí, Entre Ríos, AR";
    if (loc.includes("nogoyá") || loc.includes("nogoya")) return "Nogoyá, Entre Ríos, AR";
    if (loc.includes("la paz")) return "La Paz, Entre Ríos, AR";
    if (loc.includes("colón") || loc.includes("colon")) return "Colón, Entre Ríos, AR";
    if (loc.includes("federal")) return "Federal, Entre Ríos, AR";
    if (loc.includes("viale")) return "Viale, Entre Ríos, AR";
    if (loc.includes("seguí") || loc.includes("segui")) return "Seguí, Entre Ríos, AR";
    if (loc.includes("ramírez") || loc.includes("ramirez")) return "Ramírez, Entre Ríos, AR";

    // Si ya tiene el formato tripartito con comas
    const partes = rawUbicacion.split(',').map(p => p.trim());
    if (partes.length === 3) return rawUbicacion;

    // Si viene solo una ciudad conocida de Argentina, la complementamos
    if (loc.includes("rosario")) return "Rosario, Santa Fe, AR";
    if (loc.includes("santa fe")) return "Santa Fe, Santa Fe, AR";
    if (loc.includes("córdoba") || loc.includes("cordoba")) return "Córdoba, Córdoba, AR";
    if (loc.includes("buenos aires")) return "Buenos Aires, CABA, AR";
    if (loc.includes("mendoza")) return "Mendoza, Mendoza, AR";

    return `${rawUbicacion}, Argentina, AR`;
}

// 1. SEGURIDAD: VERIFICACIÓN DE SESIÓN Y ACCESO
function verificarAutenticacionWeb() {
    const sesion = localStorage.getItem('usuario_web') || localStorage.getItem('usuario');
    if (!sesion) {
        alert("🔒 Acceso no autorizado: Debe iniciar sesión para ingresar al Dashboard.");
        window.location.href = '../index.html';
        return false;
    }

    try {
        usuarioActual = JSON.parse(sesion);
        if (usuarioActual.estado === 'suspendido') {
            alert("🚫 Su cuenta se encuentra suspendida.");
            cerrarSesionWeb();
            return false;
        }

        const lblNom = document.getElementById('lblHeaderNombre');
        const lblRol = document.getElementById('lblHeaderRol');
        const inpEdit = document.getElementById('inputEditarNombre');

        if (lblNom) lblNom.textContent = usuarioActual.nombre || 'Usuario';
        if (inpEdit) inpEdit.value = usuarioActual.nombre || '';
        if (lblRol) {
            lblRol.textContent = (usuarioActual.rol === 'admin')
                ? 'Admin ⚙️'
                : (usuarioActual.rol === 'planificador' ? 'AuraEvents 🎪' : 'Agro 🌾');
        }

        const btnAdmin = document.getElementById('btnAdminAcceso');
        if (btnAdmin && usuarioActual.rol === 'admin') {
            btnAdmin.style.display = 'block';
        }

        renderizarFavoritosEnMenu();
        return true;
    } catch (e) {
        cerrarSesionWeb();
        return false;
    }
}

// 2. TIMEOUT POR INACTIVIDAD (30 MINUTOS)
const TIEMPO_MAXIMO_INACTIVIDAD = 30 * 60 * 1000;
let timerInactividad = null;

function reiniciarTemporizadorInactividad() {
    if (timerInactividad) clearTimeout(timerInactividad);
    timerInactividad = setTimeout(() => {
        alert("🔒 Su sesión ha expirado por 30 minutos de inactividad. Debe volver a ingresar.");
        cerrarSesionWeb();
    }, TIEMPO_MAXIMO_INACTIVIDAD);
}

['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, reiniciarTemporizadorInactividad, { passive: true });
});

function cerrarSesionWeb() {
    localStorage.removeItem('usuario_web');
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario_web');
    sessionStorage.removeItem('usuario');
    window.location.href = '../index.html';
}

// 3. MENÚ DE USUARIO Y FAVORITOS
function toggleMenuUsuario() {
    const p = document.getElementById('dropdownUsuario');
    if (p) p.classList.toggle('activo');
}

document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.user-menu-wrapper');
    const panel = document.getElementById('dropdownUsuario');
    if (wrap && panel && !wrap.contains(e.target)) {
        panel.classList.remove('activo');
    }
});

function guardarNombreUsuario() {
    const nuevo = document.getElementById('inputEditarNombre').value.trim();
    if (!nuevo) return;
    usuarioActual.nombre = nuevo;
    const str = JSON.stringify(usuarioActual);
    localStorage.setItem('usuario_web', str);
    localStorage.setItem('usuario', str);
    document.getElementById('lblHeaderNombre').textContent = nuevo;
    alert("✅ Nombre actualizado correctamente.");
}

function renderizarFavoritosEnMenu() {
    const cont = document.getElementById('listaFavoritosDropdown');
    if (!cont) return;
    const favs = JSON.parse(localStorage.getItem('favs_web') || '["Crespo, Entre Ríos, AR", "Paraná, Entre Ríos, AR"]');
    cont.innerHTML = '';

    if (favs.length === 0) {
        cont.innerHTML = '<p style="color:#718096; font-size:0.85rem; margin:4px 0;">Sin ciudades guardadas.</p>';
        return;
    }

    favs.forEach((c, idx) => {
        const row = document.createElement('div');
        row.className = 'fav-item-row';
        row.innerHTML = `
            <span style="cursor:pointer; color:#2b6cb0; font-weight:700;" onclick="consultarClimaCompleto('${c}')">📍 ${c.split(',')[0]}</span>
            <div style="display:flex; gap:4px;">
                <button onclick="editarFavorito(${idx})" title="Editar" style="border:none; background:none; cursor:pointer;">✏️</button>
                <button onclick="eliminarFavorito(${idx})" title="Eliminar" style="border:none; background:none; cursor:pointer;">❌</button>
            </div>
        `;
        cont.appendChild(row);
    });
}

function agregarFavoritoManual() {
    const inp = document.getElementById('inputNuevoFavorito');
    const val = inp.value.trim();
    if (!val) return;
    if (!validarFormatoUbicacion(val)) {
        abrirModalFormatoInvalido();
        return;
    }
    let favs = JSON.parse(localStorage.getItem('favs_web') || '[]');
    if (!favs.includes(val)) {
        favs.push(val);
        localStorage.setItem('favs_web', JSON.stringify(favs));
        renderizarFavoritosEnMenu();
        inp.value = '';
    }
}

function alternarFavoritoActual() {
    let favs = JSON.parse(localStorage.getItem('favs_web') || '[]');
    if (!favs.includes(ciudadActual)) {
        favs.push(ciudadActual);
        localStorage.setItem('favs_web', JSON.stringify(favs));
        alert(`⭐ ${ciudadActual} agregada a tus favoritos.`);
    } else {
        favs = favs.filter(c => c !== ciudadActual);
        localStorage.setItem('favs_web', JSON.stringify(favs));
        alert(`Marcador de ${ciudadActual} removido.`);
    }
    renderizarFavoritosEnMenu();
}

function editarFavorito(idx) {
    let favs = JSON.parse(localStorage.getItem('favs_web') || '[]');
    const actual = favs[idx];
    const nuevo = prompt("Modificar ciudad favorita (Formato: Ciudad, Provincia, AR):", actual);
    if (nuevo && nuevo.trim()) {
        if (!validarFormatoUbicacion(nuevo.trim())) {
            abrirModalFormatoInvalido();
            return;
        }
        favs[idx] = nuevo.trim();
        localStorage.setItem('favs_web', JSON.stringify(favs));
        renderizarFavoritosEnMenu();
    }
}

function eliminarFavorito(idx) {
    let favs = JSON.parse(localStorage.getItem('favs_web') || '[]');
    favs.splice(idx, 1);
    localStorage.setItem('favs_web', JSON.stringify(favs));
    renderizarFavoritosEnMenu();
}

// 4. VALIDACIÓN DE FORMATO ESTRICTO (Ciudad, Provincia, País)
function validarFormatoUbicacion(texto) {
    if (!texto) return false;
    const partes = texto.split(',').map(p => p.trim()).filter(p => p.length > 0);
    return partes.length === 3;
}

function abrirModalFormatoInvalido() {
    const m = document.getElementById('modalFormatoInvalido');
    if (m) m.classList.add('activa');
}

function cerrarModalFormatoInvalido() {
    const m = document.getElementById('modalFormatoInvalido');
    if (m) m.classList.remove('activa');
}

function buscarClimaWeb() {
    const val = document.getElementById('inputCiudad').value.trim();
    if (!val) return;

    if (!validarFormatoUbicacion(val)) {
        abrirModalFormatoInvalido();
        return;
    }

    consultarClimaCompleto(val);
}

// 5. DIRECCIÓN CARDINAL DEL VIENTO
function convertirGradosACardinal(grados) {
    if (grados === undefined || grados === null || grados === "" || isNaN(Number(grados))) return null;
    const g = Number(grados);
    const sectores = [
        "N ⬆️", "NNE ↗️", "NE ↗️", "ENE ↗️",
        "E ➡️", "ESE ↘️", "SE ↘️", "SSE ↘️",
        "S ⬇️", "SSO ↙️", "SO ↙️", "OSO ↙️",
        "O ⬅️", "ONO ↖️", "NO ↖️", "NNO ↖️"
    ];
    const val = Math.round((((g % 360) + 360) % 360) / 22.5) % 16;
    return sectores[val];
}

function extraerGradosDeObjeto(obj) {
    if (!obj) return null;
    if (obj.viento_grados !== undefined && obj.viento_grados !== null) return obj.viento_grados;
    if (obj.viento_deg !== undefined && obj.viento_deg !== null) return obj.viento_deg;
    if (obj.viento_direccion !== undefined && !isNaN(Number(obj.viento_direccion))) return obj.viento_direccion;
    if (obj.wind && obj.wind.deg !== undefined && obj.wind.deg !== null) return obj.wind.deg;
    if (obj.consenso?.detalles_api?.openweathermap?.viento_grados !== undefined) return obj.consenso.detalles_api.openweathermap.viento_grados;
    if (obj.consenso?.detalles_api?.tomorrow?.wind_direction !== undefined) return obj.consenso.detalles_api.tomorrow.wind_direction;
    return null;
}

function calcularDireccionPredominante(lista) {
    if (!lista || !Array.isArray(lista) || lista.length === 0) return "SE ↘️";
    let conteo = {};
    lista.slice(0, 8).forEach(item => {
        const deg = extraerGradosDeObjeto(item);
        const card = convertirGradosACardinal(deg);
        if (card) conteo[card] = (conteo[card] || 0) + 1;
    });
    let predominante = null;
    let max = 0;
    for (const [dir, c] of Object.entries(conteo)) {
        if (c > max) { max = c; predominante = dir; }
    }
    return predominante || "SE ↘️";
}

// 6. ESCALA TÉRMICA DE COLORES
function obtenerColorTermico(temp) {
    if (temp <= 8) return { bg: '#ebf8ff', border: '#bee3f8', text: '#2b6cb0' };
    if (temp <= 15) return { bg: '#e6fffa', border: '#b2f5ea', text: '#234e52' };
    if (temp <= 23) return { bg: '#f0fff4', border: '#c6f6d5', text: '#22543d' };
    if (temp <= 29) return { bg: '#fffaf0', border: '#feebc8', text: '#7b341e' };
    return { bg: '#fff5f5', border: '#fed7d7', text: '#9b2c2c' };
}

// 7. MOTOR DE CONSULTAS METEOROLÓGICAS
async function consultarClimaCompleto(ciudad) {
    ciudadActual = ciudad;
    document.getElementById('inputCiudad').value = ciudad;

    try {
        const resActual = await fetch(`${API_BASE}?ruta=/clima/actual&ciudad=${encodeURIComponent(ciudad)}`);
        const dataActual = await resActual.json();

        if (dataActual.status === 'success' || dataActual.data) {
            actualizarClimaActualUI(dataActual.data);
        }

        const resPronostico = await fetch(`${API_BASE}?ruta=/clima/pronostico&ciudad=${encodeURIComponent(ciudad)}`);
        const dataPronostico = await resPronostico.json();

        if (dataPronostico.ok !== false && Array.isArray(dataPronostico.data)) {
            pronosticoCompletoMemoria = dataPronostico.data;
            renderizarPronostico5Dias(dataPronostico.data);

            const degActual = extraerGradosDeObjeto(dataActual.data);
            const cardActual = convertirGradosACardinal(degActual);
            const elemDir = document.getElementById('lblDireccionViento');
            if (elemDir) {
                elemDir.textContent = cardActual || calcularDireccionPredominante(dataPronostico.data);
            }
        }
    } catch (err) {
        console.error("Error al obtener datos:", err);
    }
}

async function obtenerUbicacionGps() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(4);
                const lon = pos.coords.longitude.toFixed(4);
                consultarClimaPorCoordenadas(lat, lon);
            },
            () => { consultarClimaCompleto(ciudadActual); },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    } else {
        consultarClimaCompleto(ciudadActual);
    }
}

async function consultarClimaPorCoordenadas(lat, lon) {
    try {
        const resActual = await fetch(`${API_BASE}?ruta=/clima/actual&lat=${lat}&lon=${lon}`);
        const dataActual = await resActual.json();

        if (dataActual.status === 'success' || dataActual.data) {
            const clima = dataActual.data;
            // Normalización automática para que nunca quede solo "Crespo"
            ciudadActual = normalizarUbicacionArgentina(clima.ubicacion, Number(lat), Number(lon));
            clima.ubicacion = ciudadActual;
            document.getElementById('inputCiudad').value = ciudadActual;
            actualizarClimaActualUI(clima);
        }

        const resPronostico = await fetch(`${API_BASE}?ruta=/clima/pronostico&lat=${lat}&lon=${lon}`);
        const dataPronostico = await resPronostico.json();

        if (dataPronostico.ok !== false && Array.isArray(dataPronostico.data)) {
            pronosticoCompletoMemoria = dataPronostico.data;
            renderizarPronostico5Dias(dataPronostico.data);
        }
    } catch(e) {
        consultarClimaCompleto(ciudadActual);
    }
}

// 8. RENDERIZADO VISUAL Y EVALUACIÓN NORMATIVA
function actualizarClimaActualUI(clima) {
    document.getElementById('lblCiudadActual').textContent = `📍 ${clima.ubicacion || ciudadActual}`;
    document.getElementById('lblFechaActual').textContent = new Date().toLocaleDateString('es-AR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('lblTemperatura').textContent = `${Math.round(clima.temperatura)}°C`;
    document.getElementById('lblDescripcion').textContent = clima.descripcion;
    document.getElementById('lblHumedad').textContent = `${clima.humedad}%`;

    const vKmh = clima.viento_kmh || Math.round(clima.viento * 3.6);
    document.getElementById('lblViento').textContent = `${vKmh} km/h`;

    const deg = extraerGradosDeObjeto(clima);
    const card = convertirGradosACardinal(deg);
    document.getElementById('lblDireccionViento').textContent = card || (vKmh <= 3 ? "Calma / Leve" : "SE ↘️");

    document.getElementById('lblPresion').textContent = `${clima.presion || 1013} hPa`;
    document.getElementById('lblVisibilidad').textContent = `${clima.visibilidad || 10} km`;
    document.getElementById('lblSensacion').textContent = `${Math.round(clima.sensacion_termica || clima.temperatura)}°C`;

    const fuentes = clima.consenso ? clima.consenso.fuentes_consultadas : 3;
    document.getElementById('lblConsensoBadge').textContent = `Consenso: ${fuentes} APIs en vivo`;

    evaluarMarcoLegalWeb(vKmh, clima.ubicacion || ciudadActual);
    actualizarModuloRolWeb(vKmh, clima);
}

function evaluarMarcoLegalWeb(vKmh, ubicacion) {
    const locMin = ubicacion.toLowerCase();
    const esER = locMin.includes("entre ríos") || locMin.includes("entre rios");
    const esArg = locMin.includes("ar") || locMin.includes("argentina");
    const rol = usuarioActual?.rol || 'agricultor';

    const card = document.getElementById('cardEvaluacionLegal');
    const tit = document.getElementById('lblTituloLegal');
    const badge = document.getElementById('lblBadgeJurisdiccion');
    const cont = document.getElementById('lblCuerpoLegal');

    if (rol === 'planificador') {
        tit.textContent = "⛺ Seguridad de Montajes y Gazebos";
        badge.textContent = "AuraEvents Logística";
        if (vKmh > 18) {
            card.style.borderLeft = "6px solid #e53e3e";
            cont.innerHTML = `
                <div style="color: #c53030; font-weight: 800; font-size: 1.05rem; margin-bottom: 6px;">🚫 RÁFAGAS ALARMANTES (${vKmh} km/h > 18 km/h)</div>
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">Suspender tareas de montaje en altura. Reforzar anclajes de carpas estructurales y replegar gazebos de estructura liviana.</p>
            `;
        } else {
            card.style.borderLeft = "6px solid #38a169";
            cont.innerHTML = `
                <div style="color: #22543d; font-weight: 800; font-size: 1.05rem; margin-bottom: 6px;">✅ VIENTO CONTROLADO (${vKmh} km/h)</div>
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">Condición meteorológica segura para montajes temporales, carpas estructurales y sonido al aire libre.</p>
            `;
        }
    } else {
        if (esER) {
            tit.textContent = "⚖️ Evaluación Normativa de Deriva";
            badge.textContent = "Entre Ríos — Ley Nº 6.599";
            if (vKmh >= 7 && vKmh <= 15) {
                card.style.borderLeft = "6px solid #38a169";
                cont.innerHTML = `
                    <div style="color: #22543d; font-weight: 800; font-size: 1.05rem; margin-bottom: 6px;">✅ PULVERIZACIÓN HABILITADA (${vKmh} km/h)</div>
                    <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">La velocidad del viento se encuentra dentro de la banda reglamentaria legal de <b>7 a 15 km/h</b> fijada por la Ley Provincial Nº 6.599 de Entre Ríos.</p>
                `;
            } else {
                card.style.borderLeft = "6px solid #e53e3e";
                cont.innerHTML = `
                    <div style="color: #c53030; font-weight: 800; font-size: 1.05rem; margin-bottom: 6px;">🚫 PULVERIZACIÓN SUSPENDIDA (${vKmh} km/h)</div>
                    <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">Viento fuera del umbral legal obligatorio. Riesgo severo de ${vKmh < 7 ? "<b>inversión térmica</b> (gotas suspendidas en aire)" : "<b>deriva química</b> por ráfagas excesivas"}.</p>
                `;
            }
        } else if (esArg) {
            tit.textContent = "🌾 Estándar Nacional de Aplicación";
            badge.textContent = "INTA / Red BPA";
            if (vKmh >= 5 && vKmh <= 12) {
                card.style.borderLeft = "6px solid #38a169";
                cont.innerHTML = `
                    <div style="color: #22543d; font-weight: 800; font-size: 1.05rem; margin-bottom: 6px;">✅ CONDICIÓN ÓPTIMA (5 a 12 km/h)</div>
                    <p style="margin: 0; font-size: 0.95rem;">Aplicación fitosanitaria recomendada según Buenas Prácticas Agrícolas.</p>
                `;
            } else {
                card.style.borderLeft = "6px solid #dd6b20";
                cont.innerHTML = `
                    <div style="color: #c05621; font-weight: 800; font-size: 1.05rem; margin-bottom: 6px;">⚠️ APLICACIÓN NO RECOMENDADA (${vKmh} km/h)</div>
                    <p style="margin: 0; font-size: 0.95rem;">Fuera de la ventana óptima de aplicación.</p>
                `;
            }
        } else {
            tit.textContent = "🌐 Evaluación Internacional";
            badge.textContent = "Lineamientos FAO";
            cont.innerHTML = `<p style="margin: 0;">Viento actual: ${vKmh} km/h.</p>`;
        }
    }
}

// 8.1 INFORMACIÓN CRÍTICA Y DE VALOR OPERATIVO (AGRO Y AURAEVENTS)
function actualizarModuloRolWeb(vKmh, clima) {
    const rol = usuarioActual?.rol || 'agricultor';
    const tit = document.getElementById('lblTituloModuloRol');
    const cont = document.getElementById('lblCuerpoModuloRol');
    const mes = new Date().getMonth(); // 0 = Ene, 9 = Oct
    const temp = Math.round(clima.temperatura);
    const hum = clima.humedad;

    if (rol === 'planificador') {
        tit.textContent = "🎪 Centro de Inteligencia y Contingencias Logísticas — AuraEvents";
        
        // Diagnósticos de alto impacto para organizadores
        let alertaViento = (vKmh > 18) 
            ? `<div style="background:#fff5f5; border-left:4px solid #e53e3e; padding:12px; border-radius:8px; margin-bottom:10px;">
                 <b style="color:#c53030;">🚨 RIESGO ESTRUCTURAL CRÍTICO: Ráfagas de ${vKmh} km/h</b><br>
                 <span style="font-size:0.92rem; color:#4a5568;">Obligatorio: Añadir lastres de 120 kg/pata en carpas 10x10. Desmontar laterales de gazebos tubulares para evitar efecto embolsamiento de viento. Reubicar pantallas LED y banners colgantes.</span>
               </div>`
            : `<div style="background:#f0fff4; border-left:4px solid #38a169; padding:12px; border-radius:8px; margin-bottom:10px;">
                 <b style="color:#22543d;">✅ CONDICIÓN EÓLICA ESTABLE (${vKmh} km/h)</b><br>
                 <span style="font-size:0.92rem; color:#4a5568;">Permitido montaje de arcos de entrada, techos livianos, trusses de iluminación y domos geodésicos sin riesgo de desanclaje.</span>
               </div>`;

        let alertaCondensacion = (hum >= 80)
            ? `<div style="background:#fffaf0; border-left:4px solid #dd6b20; padding:12px; border-radius:8px; margin-bottom:10px;">
                 <b style="color:#c05621;">💧 ALERTA DE PUNTO DE ROCÍO Y CONDENSACIÓN (${hum}% Humedad)</b><br>
                 <span style="font-size:0.92rem; color:#4a5568;">Lo que desvela al sonidista: A partir de las 22:00 hs, la caída de temperatura alcanzará el punto de rocío. Cubrir consolas digitales de audio con telas térmicas, elevar transformadores y cableados del suelo para evitar cortocircuitos por rocío en el césped.</span>
               </div>`
            : `<div style="background:#f7fafc; border-left:4px solid #3182ce; padding:12px; border-radius:8px; margin-bottom:10px;">
                 <b style="color:#2b6cb0;">💧 HUMEDAD AMBIENTE CONTROLADA (${hum}%)</b><br>
                 <span style="font-size:0.92rem; color:#4a5568;">Bajo riesgo de condensación sobre equipamiento electrónico y pistas de baile exteriores.</span>
               </div>`;

        cont.innerHTML = `
            ${alertaViento}
            ${alertaCondensacion}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px;">
                <div style="background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #e2e8f0;">
                    <b style="color:#2d3748; font-size:1rem;">🌅 Ventana de Fotografía y Luz Natural</b>
                    <p style="margin:6px 0 0 0; font-size:0.9rem; color:#4a5568; line-height:1.45;">
                        <b>Hora Dorada:</b> 17:40 a 18:25 hs (Luz cálida y sombras suaves para recepciones y fotos principales).<br>
                        <b>Hora Azul:</b> 18:25 a 18:45 hs (Momento óptimo para encendido de guirnaldas microled y fuego perimetral).
                    </p>
                </div>
                <div style="background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #e2e8f0;">
                    <b style="color:#2d3748; font-size:1rem;">🌡️ Confort Térmico del Invitado</b>
                    <p style="margin:6px 0 0 0; font-size:0.9rem; color:#4a5568; line-height:1.45;">
                        Temperatura actual de <b>${temp}°C</b>. Si el evento es nocturno, prever calefactores tipo hongo o mantas de cortesía si baja de 16°C. Si supera los 28°C, reforzar puntos de hidratación y ventiladores nebulizadores.
                    </p>
                </div>
            </div>
        `;
    } else {
        tit.textContent = "🌱 Calendario Integral de Siembra, Suelos y Decisiones Críticas — AuraTerra Agro";

        // Análisis estacional y agronómico profundo para Entre Ríos y zona núcleo
        let queSembrar = "";
        let queNoSembrar = "";
        let temperaturaSuelo = "";
        let alertasDesvelo = "";

        if (mes >= 8 && mes <= 11) { // Primavera (Sep, Oct, Nov, Dic)
            temperaturaSuelo = "14°C a 18°C a 5 cm de profundidad (condición apta para emergencia rápida)";
            queSembrar = `
                • <b>Maíz Temprano:</b> Ventana óptima de implantación. Exige suelo a >12°C continuos para evitar pudrición de semilla.<br>
                • <b>Soja de Primera:</b> Iniciar lotes cuando el suelo supere los 15°C estables a las 8 AM.<br>
                • <b>Girasol:</b> Excelente momento en suelos bien drenados de Entre Ríos.<br>
                • <b>Sorgo Granífero:</b> Esperar firmeza térmica (>16°C) para evitar dormición seminal.
            `;
            queNoSembrar = `
                • <b>TRIGO / CEBADA:</b> Terminantemente prohibido sembrar ahora. Fuera de época absoluta; sufrirían golpe de calor y esterilidad de espiguillas.<br>
                • <b>LEGUMINOSAS DE INVIERNO (Vicia / Arveja):</b> Ventana cerrada.
            `;
            alertasDesvelo = `
                • <b>Lo que desvela al productor hoy:</b> Riesgo de <b>heladas tardías</b> en bajos durante octubre. Si el pronóstico proyecta mínimas <4°C en superficie, postergar la siembra de soja para evitar muerte de cotiledones emergidos.<br>
                • <b>Cama de siembra:</b> Asegurar barbecho químico libre de malezas resistentes (Rama Negra / Amaranthus) con 20 días de antelación para no agotar el agua útil del perfil.
            `;
        } else if (mes >= 4 && mes <= 7) { // Otoño - Invierno (May, Jun, Jul, Ago)
            temperaturaSuelo = "8°C a 12°C a 5 cm de profundidad";
            queSembrar = `
                • <b>Trigo Pan (Ciclos Largos y Medios):</b> Época pico. Densidad 250 a 300 pl/m².<br>
                • <b>Cebada Cervecera:</b> En lotes con buena fertilidad inicial de fósforo.<br>
                • <b>Cultivos de Servicios / Cobertura:</b> Vicia villosa, Centeno y Avena para fijación de nitrógeno y retención de humedad.
            `;
            queNoSembrar = `
                • <b>MAÍZ Y SOJA:</b> Prohibido sembrar. Temperaturas de suelo inferiores a 10°C inducen imbibición con agua fría y muerte embrionaria inmediata.
            `;
            alertasDesvelo = `
                • <b>Enfermedades fúngicas:</b> Monitorear Mancha Amarilla y Roya en macollaje si la humedad foliar supera las 8 horas diarias.<br>
                • <b>Nutrición:</b> Aplicación fraccionada de nitrógeno antes de pronósticos de lluvia moderada (15-20 mm) para evitar volatilización.
            `;
        } else { // Verano (Ene, Feb, Mar)
            temperaturaSuelo = ">22°C (riesgo de desecación de capa superficial)";
            queSembrar = `
                • <b>Soja de Segunda:</b> Inmediatamente tras cosecha de fina. Siembra directa para preservar cada milímetro de agua.<br>
                • <b>Maíz Tardío / Segunda:</b> Ubicar el período crítico de floración (R1) fuera de la canícula de enero.
            `;
            queNoSembrar = `
                • <b>CEREALES DE INVIERNO:</b> Prohibido terminantemente.
            `;
            alertasDesvelo = `
                • <b>Estrés hídrico y térmico:</b> Con temperaturas >35°C y vientos del norte, el aborto floral es inminente. Monitorear Oruga Cogollera (Spodoptera) y chinches en llenado de grano.
            `;
        }

        cont.innerHTML = `
            <div style="background:#f0fff4; border-left:4px solid #38a169; padding:16px; border-radius:10px; margin-bottom:14px;">
                <b style="color:#22543d; font-size:1.05rem;">🌾 Qué sembrar hoy con éxito en la región:</b>
                <div style="margin-top:6px; font-size:0.95rem; color:#2d3748; line-height:1.55;">${queSembrar}</div>
            </div>

            <div style="background:#fff5f5; border-left:4px solid #e53e3e; padding:16px; border-radius:10px; margin-bottom:14px;">
                <b style="color:#c53030; font-size:1.05rem;">🚫 Lo que NO debes sembrar bajo ningún concepto ahora:</b>
                <div style="margin-top:6px; font-size:0.95rem; color:#2d3748; line-height:1.55;">${queNoSembrar}</div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
                <div style="background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #e2e8f0;">
                    <b style="color:#2b6cb0;">🌡️ Estado Térmico del Suelo:</b>
                    <p style="margin:4px 0 0 0; font-size:0.9rem; color:#4a5568; line-height:1.45;">
                        Estimado regional: <b>${temperaturaSuelo}</b>. Controlar termómetro de suelo a las 8 AM antes de largar las tolvas.
                    </p>
                </div>
                <div style="background:#fffaf0; padding:14px; border-radius:10px; border:1px solid #feebc8;">
                    <b style="color:#c05621;">🚜 Factores Críticos del Productor:</b>
                    <p style="margin:4px 0 0 0; font-size:0.88rem; color:#7b341e; line-height:1.45;">
                        ${alertasDesvelo}
                    </p>
                </div>
            </div>
        `;
    }
}

// 9. PRONÓSTICO 5 DÍAS CON HORARIOS Y COLOR TÉRMICO
function renderizarPronostico5Dias(lista) {
    const cont = document.getElementById('contenedorPronostico5Dias');
    if (!cont) return;
    cont.innerHTML = '';

    let diasMap = {};
    lista.forEach(item => {
        const d = new Date(item.dt * 1000);
        const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!diasMap[clave]) diasMap[clave] = [];
        diasMap[clave].push(item);
    });

    const fechas = Object.keys(diasMap).slice(0, 5);
    if (!diaSeleccionadoClave || !fechas.includes(diaSeleccionadoClave)) {
        diaSeleccionadoClave = fechas[0];
    }

    fechas.forEach(fechaClave => {
        const items = diasMap[fechaClave];
        let max = -999, min = 999;
        items.forEach(i => {
            if (i.main.temp_max > max) max = i.main.temp_max;
            if (i.main.temp_min < min) min = i.main.temp_min;
        });

        const rep = items.find(i => i.dt_txt?.includes("12:00:00")) || items[0];
        const dateObj = new Date(rep.dt * 1000);
        const diaNombre = dateObj.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
        const dir = convertirGradosACardinal(extraerGradosDeObjeto(rep)) || "SE ↘️";
        const esActivo = (fechaClave === diaSeleccionadoClave);

        const card = document.createElement('div');
        card.className = 'day-forecast-item';
        card.style.border = esActivo ? '2px solid #3182ce' : '1.5px solid #e2e8f0';
        card.style.background = esActivo ? '#ebf8ff' : '#f8fafc';

        card.innerHTML = `
            <b style="font-size: 1.05rem; color: ${esActivo ? '#2b6cb0' : '#2d3748'}; text-transform: capitalize; display:block; margin-bottom:4px;">${diaNombre}</b>
            <div style="font-size: 1.7rem; font-weight: 800; margin: 4px 0; color: #1a202c;">${Math.round(rep.main.temp)}°C</div>
            <div style="font-size: 0.9rem; font-weight: 700; margin-bottom: 6px;">
                <span style="color:#e53e3e;">↑ ${Math.round(max)}°</span> / 
                <span style="color:#3182ce;">↓ ${Math.round(min)}°</span>
            </div>
            <div style="font-size: 0.85rem; text-transform: capitalize; color: #4a5568; margin-bottom: 4px;">${rep.weather[0].description}</div>
            <small style="color: #718096; display: block; font-weight: 600;">💨 ${Math.round(rep.wind.speed * 3.6)} km/h (${dir})</small>
            <div style="font-size:0.8rem; color:#3182ce; font-weight:bold; margin-top:8px;">Ver horas ➔</div>
        `;

        card.onclick = () => {
            diaSeleccionadoClave = fechaClave;
            renderizarPronostico5Dias(lista);
            renderizarHorasTermicas(items, diaNombre);
        };

        cont.appendChild(card);
    });

    const itemsActivos = diasMap[diaSeleccionadoClave];
    const dAct = new Date(itemsActivos[0].dt * 1000);
    const nomAct = dAct.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' });
    renderizarHorasTermicas(itemsActivos, nomAct);
}

function renderizarHorasTermicas(itemsDelDia, nombreDia) {
    const cont = document.getElementById('contenedorHorasTermicas');
    const tit = document.getElementById('lblTituloHorario');
    if (!cont) return;

    if (tit) tit.textContent = `🕒 Intervalos Horarios — ${nombreDia}`;
    cont.innerHTML = '';

    itemsDelDia.forEach(h => {
        const dObj = new Date(h.dt * 1000);
        const hora = dObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const temp = Math.round(h.main.temp);
        const vKmh = Math.round(h.wind.speed * 3.6);
        const dir = convertirGradosACardinal(extraerGradosDeObjeto(h)) || "SE ↘️";
        const estiloTermico = obtenerColorTermico(temp);

        cont.innerHTML += `
            <div class="hour-block-cell" style="background: ${estiloTermico.bg}; border: 1.5px solid ${estiloTermico.border};">
                <span style="color: ${estiloTermico.text}; font-weight: 800; font-size: 1.05rem;">${hora} hs</span>
                <span style="color: ${estiloTermico.text}; font-size: 1.45rem; font-weight: 800;">${temp}°C</span>
                <span style="color: #4a5568; font-size: 0.82rem; text-transform: capitalize;">${h.weather[0].description}</span>
                <span style="color: #718096; font-size: 0.85rem; font-weight: 600;">💨 ${vKmh} km/h (${dir})</span>
            </div>
        `;
    });
}

// 10. MODALES QUIÉNES SOMOS & ADMIN
function abrirModalInstitucional(e) {
    if (e) e.preventDefault();
    document.getElementById('modalQuienesSomos').classList.add('activa');
}

function cerrarModalInstitucional() {
    document.getElementById('modalQuienesSomos').classList.remove('activa');
}

async function abrirModalAdmin() {
    document.getElementById('dropdownUsuario').classList.remove('activo');
    const modal = document.getElementById('modalAdmin');
    if (modal) modal.classList.add('activa');

    const listaUsr = document.getElementById('listaUsuariosAdmin');
    const boxRank = document.getElementById('rankingClicksAdmin');
    const boxUltimos = document.getElementById('ultimosClicksAdmin');

    if (listaUsr) listaUsr.innerHTML = 'Cargando usuarios...';
    if (boxRank) boxRank.innerHTML = 'Cargando ranking...';
    if (boxUltimos) boxUltimos.innerHTML = 'Cargando auditoría...';

    try {
        const res = await fetch(`${API_BASE}?ruta=/admin/telemetria`);
        const data = await res.json();

        if (data.status === 'ok') {
            if (data.usuarios && data.usuarios.length > 0) {
                listaUsr.innerHTML = '';
                data.usuarios.forEach(u => {
                    let color = u.estado === 'activo' ? '#27ae60' : (u.estado === 'prueba' ? '#dd6b20' : '#e53e3e');
                    let infoDias = u.estado === 'prueba' ? `<small style="color:#718096;">(⏳ ${u.dias_restantes}d)</small>` : '';

                    listaUsr.innerHTML += `
                        <div style="padding: 10px 0; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <div>
                                <b style="color: #2d3748; font-size: 1.05rem;">${u.nombre}</b> (${u.email})<br>
                                <span style="color: ${color}; font-weight: 800; font-size: 0.85rem;">${u.estado.toUpperCase()}</span> ${infoDias} | Rol: <b>${u.rol}</b>
                            </div>
                            <div>
                                <select onchange="cambiarEstadoUsuarioDesdeWeb(${u.id}, this.value)" style="padding: 6px 10px; border-radius: 8px; border: 1.5px solid #cbd5e0; font-weight: 700; font-size: 0.9rem; background: #fff; cursor: pointer;">
                                    <option value="" disabled selected>Cambiar estado...</option>
                                    <option value="activo" ${u.estado === 'activo' ? 'disabled' : ''}>🟢 Activar (Pagado)</option>
                                    <option value="prueba" ${u.estado === 'prueba' ? 'disabled' : ''}>🟠 Modo Prueba</option>
                                    <option value="suspendido" ${u.estado === 'suspendido' ? 'disabled' : ''}>🔴 Suspender</option>
                                </select>
                            </div>
                        </div>
                    `;
                });
            } else {
                listaUsr.innerHTML = '<p>Sin usuarios registrados.</p>';
            }

            if (data.ranking && data.ranking.length > 0) {
                let html = '<ol style="margin: 0; padding-left: 20px; line-height: 1.6;">';
                data.ranking.forEach(r => {
                    html += `<li><b>${r.componente_clickeado}</b>: ${r.total} clics</li>`;
                });
                html += '</ol>';
                boxRank.innerHTML = html;
            } else {
                boxRank.innerHTML = '<p>Sin datos de telemetría.</p>';
            }

            if (data.ultimos && data.ultimos.length > 0) {
                let htmlU = '<ul style="margin: 0; padding-left: 18px; line-height: 1.6;">';
                data.ultimos.forEach(e => {
                    let f = e.fecha_hora ? e.fecha_hora.split(' ')[1] || e.fecha_hora : '';
                    htmlU += `<li><span style="color:#718096; font-size:0.85rem;">[${f}]</span> <b>${e.usuario}</b>: ${e.componente_clickeado}</li>`;
                });
                htmlU += '</ul>';
                boxUltimos.innerHTML = htmlU;
            } else {
                boxUltimos.innerHTML = '<p>Sin actividad reciente.</p>';
            }
        }
    } catch(err) {
        if (listaUsr) listaUsr.innerHTML = '<p style="color:#e53e3e;">Error al consultar telemetría.</p>';
    }
}

async function cambiarEstadoUsuarioDesdeWeb(userId, nuevoEstado) {
    if (!nuevoEstado) return;
    try {
        const formData = new URLSearchParams();
        formData.append('user_id', userId);
        formData.append('estado', nuevoEstado);

        const res = await fetch(`${API_BASE}?ruta=/admin/cambiar_estado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const d = await res.json();
        if (d.status === 'ok') {
            abrirModalAdmin();
        } else {
            alert("⚠️ " + (d.message || "No se pudo actualizar"));
        }
    } catch(e) {
        alert("❌ Error de red al intentar actualizar estado.");
    }
}

function cerrarModalAdmin() {
    const modal = document.getElementById('modalAdmin');
    if (modal) modal.classList.remove('activa');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModalAdmin();
        cerrarModalInstitucional();
        cerrarModalFormatoInvalido();
    }
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (verificarAutenticacionWeb()) {
        reiniciarTemporizadorInactividad();
        consultarClimaCompleto(ciudadActual);

        const inp = document.getElementById('inputCiudad');
        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarClimaWeb();
                }
            });
        }
    }
});