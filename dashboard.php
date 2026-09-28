<?php
declare(strict_types=1);
if (function_exists('session_status')) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
} else {
    if (session_id() === '') {
        session_start();
    }
}
//si nada de eso pasa es un intruso asi que le pide que se loguee
if (!isset($_SESSION['user_id'])) { header('Location: /auraTerraMayo/login'); exit; }

//Destruye el bucle y los manda al cartel de soporte con el mail corporativo
$estadoUsuario = strtolower(trim($_SESSION['user_estado'] ?? 'prueba'));
if ($estadoUsuario === 'suspendido') {
    $_SESSION = [];
    if (function_exists('session_destroy')) {
        session_destroy();
    }
    header('Location: /auraTerraMayo/index.php?error_suspension_manual=1'); 
    exit; 
}

$colorBarra = ($estadoUsuario === 'bajo prueba' || $estadoUsuario === 'prueba') ? "#dd6b20" : "#27ae60";
$textoLicencia = ($estadoUsuario === 'bajo prueba' || $estadoUsuario === 'prueba') ? "⏳ Periodo de Evaluación Educativo" : "🚀 Licencia Real Activa";
$nombreUsuario = $_SESSION['user_nombre'] ?? 'Usuario';
$emailUsuario = strtolower(trim($_SESSION['user_email'] ?? 'global'));
$rolUsuario = strtolower(trim($_SESSION['user_rol'] ?? 'agricultor')); 
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Dashboard - AuraTerra</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background-color: #f4f7f6; color: #2d3748; margin: 0; padding: 0; scroll-behavior: smooth; }
        .estado-licencia-barra { background-color: <?php echo $colorBarra; ?>; color: white; text-align: center; padding: 10px; font-weight: bold; font-size: 0.95rem; }
        .toast-notificacion { display: none; background-color: #2d3748; color: white; padding: 14px 24px; position: fixed; bottom: 30px; left: 30px; z-index: 999999; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-weight: 600; border-left: 5px solid #27ae60; }
        header { background-color: white; padding: 10px 40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.04); position: relative; }
        .logo-container-btn { background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; align-items: center; outline: none; position: relative; z-index: 10; }
        .logo-img { width: 185px; height: auto; object-fit: contain; }
        .eslogan-central-header { position: absolute; left: 50%; transform: translateX(-50%); font-style: italic; color: #718096; font-size: 1.05rem; font-weight: 500; text-align: center; max-width: 450px; line-height: 1.3; pointer-events: none !important; z-index: 1; user-select: none; }
        .user-menu-container { position: relative; z-index: 10; }
        .user-trigger { cursor: pointer; font-weight: 600; padding: 10px 18px; background: #edf2f7; border-radius: 20px; user-select: none; display: inline-block; }
        .dropdown-menu { display: none; position: absolute; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 8px; padding: 15px; right: 0; top: 48px; z-index: 100000; min-width: 220px; border: 1px solid #e2e8f0; }
        .container { max-width: 1440px; margin: 0 auto; padding: 25px; }
        .buscador-box { background: white; padding: 22px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); margin-bottom: 25px; border: 1px solid #e2e8f0; }
        .buscador-inputs-row { display: flex; gap: 12px; align-items: center; width: 100%; }
        .buscador-inputs-row input { flex: 1; padding: 12px 18px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 1rem; background-color: #f8fafc; height: 46px; box-sizing: border-box; outline: none; }
        #btnGps, #btnFav { width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; cursor: pointer; border-radius: 8px; border: 1px solid #cbd5e0; background: #fff; box-sizing: border-box; }
        #btnBuscar { background: #3182ce; color: white; border: none; padding: 0 25px; height: 46px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem; white-space: nowrap; box-sizing: border-box; }
        .bloque-hoy-3-columnas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: stretch; margin-bottom: 5px; }
        .card { background: white; padding: 22px; border-radius: 14px; border: 1px solid #edf2f7; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .card h3 { margin-top: 0; margin-bottom: 12px; font-size: 1.25rem; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 8px; font-weight: 700; }
        .texto-agrandado-legible { font-size: 1.25rem !important; line-height: 1.6 !important; color: #2d3748; }
        .tip-item-premium { margin-bottom: 16px; padding-bottom: 4px; }
        .grid-cinco-columnas-dias { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-top: 15px; }
        .columna-dia-vertical { padding: 15px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.01); border: 1px solid #cbd5e0; min-height: 420px; }
        .titulo-dia-vertical { text-transform: uppercase; font-weight: 800; font-size: 1rem; text-align: center; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid rgba(0,0,0,0.08); color: #1a202c; }
        .tarjeta-hora-interna { padding: 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); margin-bottom: 8px; }
        .temp-principal { font-size: 5rem !important; font-weight: 900; color: #1a202c; margin: 5px 0; display: block; line-height: 1; letter-spacing: -2px; }
        .divisor-navegacion-interactivo { width: 100%; text-align: center; margin: 15px 0 20px 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #3182ce; font-weight: bold; font-size: 1.05rem; user-select: none; }
        .divisor-navegacion-interactivo .flecha-animada { font-size: 1.5rem; animation: bounceFlecha 1.5s infinite; }
        @keyframes bounceFlecha { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
        
        .modal-alert-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(30, 41, 59, 0.45); backdrop-filter: blur(4px); display: none; justify-content: center; align-items: center; z-index: 999999; }
        .modal-alert-overlay.show { display: flex; }
        .modal-alert-card { background: white; padding: 30px; border-radius: 16px; width: 95%; max-width: 650px; box-shadow: 0 20px 25px rgba(0,0,0,0.15); text-align: left; }
        .input-modal-premium { width: 100%; padding: 12px; border: 2px solid #cbd5e0; border-radius: 8px; font-size: 1rem; margin: 15px 0; box-sizing: border-box; outline: none; }
        .btn-modal-confirm { background: #3182ce; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 15px; }
        .info-grid-modal { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .info-card-modal { background: #f8fafc; padding: 15px; border-radius: 10px; border-left: 4px solid #3182ce; }
        .info-card-modal h4 { margin: 0 0 8px 0; color: #2c5282; font-size: 1.1rem; }
        .info-card-modal p { margin: 0; font-size: 0.9rem; color: #4a5568; line-height: 1.4; }
    </style>
</head>
<body>
    <div id="toastApp" class="toast-notificacion"></div>
    <div class="estado-licencia-barra"><?php echo $textoLicencia; ?> — Operador: <?php echo htmlspecialchars($nombreUsuario); ?></div>

    <header id="seccionCabeceraTop">
        <button class="logo-container-btn" id="btnLogoInfo">
            <img src="/auraTerraMayo/public/img/image_67422e.jpg" class="logo-img" alt="Logo">
        </button>
        <div class="eslogan-central-header">"Los 21gr del timo que acompañan el éxito de la organización de tu actividad al aire libre"</div>
        <div class="user-menu-container">
            <div class="user-trigger" id="userTrigger">Panel: <?php echo htmlspecialchars($nombreUsuario); ?> ▾</div>
            <div class="dropdown-menu" id="dropdownMenu">
                <div style="font-weight:bold; margin-bottom:8px; border-bottom:1px solid #edf2f7; padding-bottom:4px;">📍 Favoritos</div>
                <div id="listaFavoritosContent"></div>
                <?php if ($rolUsuario === 'admin'): ?>
                    <a href="/auraTerraMayo/admin_console.php" style="color: #3182ce; font-weight: bold; padding: 8px 0; display: block; text-decoration: none; font-size: 0.95rem; border-top: 1px solid #edf2f7; margin-top: 5px;">⚙️ Consola Especial Admin</a>
                <?php endif; ?>
                <a href="/auraTerraMayo/logout" style="color:#e53e3e; text-decoration:none; display:block; margin-top:10px; font-weight:bold; border-top:1px solid #edf2f7; padding-top:8px;">Cerrar Sesión</a>
            </div>
        </div>
    </header>

    <div class="container">
        <div class="buscador-box">
            <div class="buscador-inputs-row">
                <input type="text" id="inputCiudad" placeholder="Ej: Crespo, Entre Ríos, AR">
                <button id="btnBuscar">Consultar Clima</button>
                <button id="btnGps" title="Ubicación Actual">📍</button>
                <button id="btnFav" title="Guardar Favorito">★</button>
            </div>
            <div id="coordenadasActuales" style="margin-top: 10px; font-size: 0.9rem; color:#718096;"></div>
        </div>

        <div class="bloque-hoy-3-columnas" id="seccionClimaHoyPrincipal">
            <div class="card" id="cardActual"><h3>Condiciones Actuales</h3><div id="bloqueActual"><p style="color:#718096;">Sincronizando...</p></div></div>
            <div class="card" id="cardControlTermicoMini"><h3>Control Térmico (24hs)</h3><div id="bloqueExtremas24hCont"><p style="color:#718096;">Evaluando extremos...</p></div></div>
            <div class="card" id="cardLegalFumigacion"><h3 id="tituloDinamicoLegal">Análisis de Operaciones</h3><div id="bloqueLegalFumigacion"><p style="color:#718096;">Evaluando vientos...</p></div></div>
        </div>

        <div class="divisor-navegacion-interactivo" onclick="document.getElementById('seccionBloquesInformacionCard').scrollIntoView({behavior:'smooth'});">
            <span>Presioná acá para pasar al siguiente bloque de información</span>
            <span class="flecha-animada">🔽</span>
        </div>

        <div class="card" id="cardPronosticoCardMaster" style="margin-bottom: 25px;">
            <h3>Tendencias (Próximos 5 Días)</h3>
            <div class="grid-cinco-columnas-dias" id="bloquePronostico"><p style="grid-column: span 5; text-align:center;">Cargando cuadrícula...</p></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;" id="seccionBloquesInformacionCard">
            <div class="card" style="border-left: 5px solid #dd6b20;">
                <h3>🛡️ Gestión Predictiva de Riesgos (72hs) y Monitoreo Unificado</h3>
                <div id="bloqueAlertas" class="texto-agrandado-legible"><p style="color:#718096;">Mapeando alertas...</p></div>
            </div>
            <div class="card" id="cardFiltroDinamicoRol" style="border-left: 5px solid #3182ce;">
                <h3 id="tituloFiltroDinamicoRol">Módulo Operativo / Planificación Sugerida</h3>
                <div id="bloqueFiltroDinamicoRol" class="texto-agrandado-legible"><p style="color:#718096;">Calculando ciclos regionales...</p></div>
                <div id="bloqueSecundarioRol" style="margin-top:15px;"></div>
            </div>
        </div>
    </div>

    <div class="modal-alert-overlay" id="modalInfoCorporativo">
        <div class="modal-alert-card">
            <div style="text-align: center; margin-bottom: 10px;">
                <img src="/auraTerraMayo/public/img/image_67422e.jpg" style="width: 140px; height: auto;" alt="Logo">
                <h2 style="color:#2b6cb0; margin: 10px 0 5px 0;">AuraTerra</h2>
            </div>
            <div class="info-grid-modal">
                <div class="info-card-modal">
                    <h4>👥 Quiénes Somos</h4>
                    <p>Somos una plataforma de ingeniería agroclimatológica en Entre Ríos, fundada por <b>Javier Folmer, Soledad Gareis y Tamara Godoy</b>.</p>
                </div>
                <div class="info-card-modal">
                    <h4>⚙️ Cómo funciona</h4>
                    <p>Procesamos hilos asincrónicos de OpenWeather cruzados con marcos legales de deriva fitosanitaria y seguridad estructural.</p>
                </div>
            </div>
            
            <div class="info-card-modal" style="margin-top:20px; width:100%; border-left-color:#27ae60;">
                <h4>🚀 Qué Nos Diferencia del Resto</h4>
                <p>Transformamos analíticas crudas atmosféricas en marcos de decisión operativos personalizados de forma directa por rol de usuario activo, blindando tus montajes perimetrales y siembras zonales.</p>
            </div>
            
            <button id="btnCerrarModalInfo" class="btn-modal-confirm">Volver al Panel Técnico ⬅️</button>
        </div>
    </div>

    <div class="modal-alert-overlay" id="modalAgregarAliasFav">
        <div class="modal-alert-card">
            <h3>⭐ Asignar Alias Favorito</h3>
            <p style="color:#718096; font-size:0.85rem; margin-bottom:10px;">Ingresá una etiqueta descriptiva para este lote:</p>
            <input type="text" id="inputModalAlias" class="input-modal-premium" placeholder="Ej: Mi Campo Principal">
            <div class="modal-actions-row">
                <button id="btnCancelarAlias" class="btn-modal-action btn-modal-cancel" style="background:#e2e8f0; color:#4a5568; padding:10px 15px; border-radius:6px; border:none; cursor:pointer;">Cancelar</button>
                <button id="btnConfirmarAlias" class="btn-modal-action btn-modal-confirm" style="background:#3182ce; color:white; padding:10px 15px; border-radius:6px; border:none; cursor:pointer; margin-top:0;">Guardar Marcador</button>
            </div>
        </div>
    </div>

    <div id="modalErrorBuscador" class="modal-alert-overlay">
        <div class="modal-alert-card" style="text-align:center;">
            <h3 style="color:#e53e3e; margin-top:0;">⚠️ Formato de Búsqueda Inválido</h3>
            <p style="color:#4a5568; line-height:1.5; text-align:left;">Por favor, ingrese la localidad respetando la estructura obligatoria de tres términos separados por comas:<br><br><b>Ciudad, Provincia, País</b><br><br><i>Ejemplo: Crespo, Entre Ríos, AR</i></p>
            <button id="btnCerrarModalError" class="btn-premium-accion" style="background:#e53e3e; width:100%; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold;">Entendido</button>
        </div>
    </div>

    <div class="modal-alert-overlay" id="modalAgregarAliasFav">
        <div class="modal-alert-card">
            <h3>⭐ Asignar Alias Favorito</h3>
            <p style="color:#718096; font-size:0.85rem; margin-bottom:10px;">Ingresá una etiqueta descriptiva para este lote:</p>
            <input type="text" id="inputModalAlias" class="input-modal-premium" placeholder="Ej: Mi Campo Principal">
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:15px;">
                <button id="btnCancelarAlias" style="background:#e2e8f0; color:#4a5568; padding:10px 15px; border-radius:6px; border:none; cursor:pointer;">Cancelar</button>
                <button id="btnConfirmarAlias" style="background:#3182ce; color:white; padding:10px 15px; border-radius:6px; border:none; cursor:pointer;">Guardar Marcador</button>
            </div>
        </div>
    </div>
                    
    <div class="modal-alert-overlay" id="modalEditarAliasFav">
        <div class="modal-alert-card">
            <h3>📝 Renombrar Alias de Favorito</h3>
            <p style="color:#718096; font-size:0.85rem; margin-bottom:10px;">Modificá el nombre identificatorio de esta localidad guardada:</p>
            <input type="text" id="inputModalEditarAlias" class="input-modal-premium" style="width:100%; padding:12px; border:2px solid #cbd5e0; border-radius:8px; outline:none; margin:10px 0;">
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:15px;">
                <button onclick="document.getElementById('modalEditarAliasFav').classList.remove('show')" style="background:#e2e8f0; color:#4a5568; padding:10px 15px; border-radius:6px; border:none; cursor:pointer;">Cancelar</button>
                <button id="btnConfirmarEditarAlias" style="background:#27ae60; color:white; padding:10px 15px; border-radius:6px; border:none; cursor:pointer;">Actualizar Nombre</button>
            </div>
        </div>
    </div>

    <script>
        // La URL de tu servidor PHP que procesa los datos:
        const URL_BASE_SISTEMA = "http://localhost/auraTerraMayo/auraterra-backend-api";
        const BASE_URL_PROYECTO = "/auraTerraMayo";
        const ROL_DE_SESION_ACTIVO = "<?php echo $rolUsuario; ?>";
        const NOMBRE_DE_USUARIO_SESION = "<?php echo $emailUsuario; ?>";

        window.addEventListener('DOMContentLoaded', () => {
            const ut = document.getElementById('userTrigger'); const dm = document.getElementById('dropdownMenu');
            if (ut && dm) {
                ut.addEventListener('click', (e) => { e.stopPropagation(); dm.style.display = (dm.style.display === 'block') ? 'none' : 'block'; });
            }
            document.addEventListener('click', () => { if (dm) dm.style.display = 'none'; });
        });
    </script>
    <script src="/auraTerraMayo/auraterra-backend-api/public/js/dashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>