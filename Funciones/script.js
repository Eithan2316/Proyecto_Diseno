/*Se llevarán funciones solicitadas por la rúbrica y demás funciones que ayuden a una buena experiencia de usuario*/

console.log("🚀 Business Sky: Script de JavaScript cargado correctamente.");

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ESTRUCTURA DE DATOS Y GESTIÓN DE SESIÓN ---
    let publicaciones = [];
    let usuariosRegistrados = [];
    let usuarioLogueado = null;

    try {
        const pubsGuardadas = localStorage.getItem('businessSky_publicaciones');
        if (pubsGuardadas) publicaciones = JSON.parse(pubsGuardadas);

        const usuariosGuardados = localStorage.getItem('businessSky_usuarios');
        if (usuariosGuardados) usuariosRegistrados = JSON.parse(usuariosGuardados);

        const sesionActual = localStorage.getItem('businessSky_usuarioLogueado');
        if (sesionActual) usuarioLogueado = JSON.parse(sesionActual);
    } catch (error) {
        console.warn("⚠️ Error al leer localStorage:", error);
    }

    // Publicaciones por defecto si está vacío
    if (!publicaciones || publicaciones.length === 0) {
        publicaciones = [
            {
                id: 1,
                usuario: "Oliver Queen",
                negocio: "Queen Industries",
                contenido: "Con nosotros tus necesidades están resueltas. Contamos con una gran variedad de electrodomésticos y dispositivos electrónicos.",
                categoria: "tecnología",
                cantidadMeGusta: 5400,
                comentarios: [
                    {
                        autor: "Mónica Retana",
                        negocio: "Kairos Desing",
                        texto: "¡Excelente catálogo de dispositivos!",
                        fecha: "18/11/2026"
                    }
                ]
            },
            {
                id: 2,
                usuario: "Mónica Retana",
                negocio: "Kairos Desing",
                contenido: "Emprendimiento especializado en la personalización de artículos: camisas, tazas, gorras y mucho más.",
                categoria: "Personalización de artículos",
                cantidadMeGusta: 7000,
                comentarios: []
            }
        ];
    }

    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const seccionPublicaciones = document.querySelector('#Publicaciones');
    const formularioCrearPub = document.querySelector('#Formulario_Publicacion');
    const formularioRegistro = document.querySelector('#registro');
    const formularioLogin = document.querySelector('#formulario_login');
    const seccionAutenticacion = document.querySelector('#Autenticacion');
    const botonTema = document.querySelector('#boton_Tema');

    // Inicializar sistemas de la página
    renderizarPublicaciones(publicaciones);
    inicializarModoOscuro();
    inicializarEstadoConexion();
    crearContenedorToast();
    agregarBarraFiltros();
    gestionarEstadoSesionVisual();

    // --- 2. GESTIÓN DE USUARIOS, REGISTRO Y LOGIN ---

    if (formularioRegistro) {
        formularioRegistro.addEventListener('submit', (e) => {
            e.preventDefault();

            const nombre = document.querySelector('#registro_nombre').value.trim();
            const negocio = document.querySelector('#registro_negocio').value.trim();
            const correo = document.querySelector('#registro_correo').value.trim();
            const password = document.querySelector('#registro_password').value.trim();
            const telefono = document.querySelector('#registro_telefono').value.trim();
            const biografia = document.querySelector('#registro_biografia').value.trim();
            const tipoLocal = document.querySelector('#registro_local').value;
            const ubicacion = document.querySelector('#registro_ubicación').value.trim();
            const links = document.querySelector('#registro_links').value.trim();

            const existe = usuariosRegistrados.find(u => u.correo === correo);
            if (existe) {
                mostrarNotificacion("⚠️ Este correo electrónico ya está registrado.", "error");
                return;
            }

            const nuevoUsuario = {
                nombre,
                negocio,
                correo,
                password,
                telefono,
                biografia: biografia || "Emprendedor apasionado en Business Sky.",
                tipoLocal: tipoLocal === "en_linea" ? "En línea" : "Sede física",
                ubicacion: ubicacion || "Costa Rica",
                links: links || "business.sky",
                imagen: "Imagenes/perfil_prueba.png",
                seguidores: 0,
                seguidos: 0
            };

            usuariosRegistrados.push(nuevoUsuario);
            localStorage.setItem('businessSky_usuarios', JSON.stringify(usuariosRegistrados));

            usuarioLogueado = nuevoUsuario;
            localStorage.setItem('businessSky_usuarioLogueado', JSON.stringify(usuarioLogueado));

            formularioRegistro.reset();
            mostrarNotificacion(`🎉 ¡Cuenta creada con éxito! Bienvenido, ${nombre}`, "exito");
            
            gestionarEstadoSesionVisual();
            renderizarPublicaciones(publicaciones);
        });
    }

    if (formularioLogin) {
        formularioLogin.addEventListener('submit', (e) => {
            e.preventDefault();

            const correo = document.querySelector('#login_correo').value.trim();
            const password = document.querySelector('#login_password').value.trim();

            const usuarioEncontrado = usuariosRegistrados.find(u => u.correo === correo && u.password === password);

            if (usuarioEncontrado) {
                usuarioLogueado = usuarioEncontrado;
                localStorage.setItem('businessSky_usuarioLogueado', JSON.stringify(usuarioLogueado));
                
                formularioLogin.reset();
                mostrarNotificacion(`👋 ¡Hola de nuevo, ${usuarioEncontrado.nombre}!`, "exito");
                gestionarEstadoSesionVisual();
                renderizarPublicaciones(publicaciones);
            } else {
                mostrarNotificacion("❌ Correo o contraseña incorrectos.", "error");
            }
        });
    }

    // --- 3. GESTIÓN VISUAL DE LA SESIÓN Y PERFIL ---

    function gestionarEstadoSesionVisual() {
        if (!seccionAutenticacion) return;

        if (usuarioLogueado) {
            seccionAutenticacion.style.display = 'none';
            actualizarDatosPerfil(usuarioLogueado);
        } else {
            seccionAutenticacion.style.display = 'block';
            actualizarDatosPerfilDefault();
        }
    }

    function actualizarDatosPerfil(usuario) {
        const seccionPerfil = document.querySelector('#Perfil');
        if (!seccionPerfil) return;

        document.querySelector('#texto_nombre').textContent = usuario.nombre;
        document.querySelector('#num_seguidores').textContent = usuario.seguidores;
        document.querySelector('#num_seguidos').textContent = usuario.seguidos;
        document.querySelector('#bio_usuario').textContent = usuario.biografia;
        document.querySelector('#texto_tipo_negocio').textContent = usuario.tipoLocal;
        document.querySelector('#ubicacion_usuario').innerHTML = `Ubicación: ${usuario.ubicacion}`;
        document.querySelector('#telefono_usuario').innerHTML = `Número de teléfono: ${usuario.telefono}`;
        document.querySelector('#links_usuario').innerHTML = `Links: <a href="${usuario.links}" target="_blank" style="color: var(--amarillo-estrella);">${usuario.links}</a>`;

        let contenedorLogout = seccionPerfil.querySelector('#contenedor-logout');
        if (!contenedorLogout) {
            contenedorLogout = document.createElement('div');
            contenedorLogout.id = 'contenedor-logout';
            contenedorLogout.style.cssText = `margin-top: 20px; text-align: center; border-top: 1px solid var(--purple-navy); padding-top: 15px;`;
            seccionPerfil.appendChild(contenedorLogout);
        }

        contenedorLogout.innerHTML = `
            <p style="color: var(--color-principal); font-size: 0.9rem; margin-bottom: 10px;">Sesión activa como: <strong>${usuario.correo}</strong></p>
            <button id="btn-cerrar-sesion" style="background-color: #EF4444; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: background 0.3s;">
                🚪 Cerrar sesión / Cambiar cuenta
            </button>
        `;

        const btnCerrar = contenedorLogout.querySelector('#btn-cerrar-sesion');
        btnCerrar.addEventListener('click', () => {
            usuarioLogueado = null;
            localStorage.removeItem('businessSky_usuarioLogueado');
            mostrarNotificacion("🔒 Has cerrado sesión correctamente.", "info");
            gestionarEstadoSesionVisual();
            renderizarPublicaciones(publicaciones);
        });
    }

    function actualizarDatosPerfilDefault() {
        const seccionPerfil = document.querySelector('#Perfil');
        if (!seccionPerfil) return;

        document.querySelector('#texto_nombre').textContent = "Invitado / Sin sesión";
        document.querySelector('#num_seguidores').textContent = "0";
        document.querySelector('#num_seguidos').textContent = "0";
        document.querySelector('#bio_usuario').textContent = "Inicia sesión o crea una cuenta para gestionar tus publicaciones y perfil.";
        document.querySelector('#texto_tipo_negocio').textContent = "---";
        document.querySelector('#ubicacion_usuario').innerHTML = `Ubicación: ---`;
        document.querySelector('#telefono_usuario').innerHTML = `Número de teléfono: ---`;
        document.querySelector('#links_usuario').innerHTML = `Links: ---`;

        const contenedorLogout = seccionPerfil.querySelector('#contenedor-logout');
        if (contenedorLogout) {
            contenedorLogout.innerHTML = `<p style="color: var(--dark-blue-gray); font-size: 0.9rem;">Inicia sesión arriba para ver tus datos.</p>`;
        }
    }

    // --- 4. RENDERIZADO DE PUBLICACIONES, COMENTARIOS Y PERMISOS ---

    function renderizarPublicaciones(listaPubs) {
        if (!seccionPublicaciones) return;

        seccionPublicaciones.innerHTML = '';

        if (listaPubs.length === 0) {
            seccionPublicaciones.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--dark-blue-gray);">
                    <p>No hay publicaciones disponibles en esta categoría.</p>
                </div>
            `;
            return;
        }

        listaPubs.forEach(pub => {
            if (!pub.comentarios) pub.comentarios = [];

            const article = document.createElement('article');
            article.classList.add('publicacion');
            article.setAttribute('data-id', pub.id);

            // Generar HTML de comentarios adaptado a variables de color
            let comentariosHTML = '';
            pub.comentarios.forEach(c => {
                comentariosHTML += `
                    <div class="comentario-item" style="background: rgba(0, 0, 0, 0.1); padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid var(--purple-navy);">
                        <div style="font-size: 0.8rem; color: var(--amarillo-estrella); font-weight: bold;">
                            💬 ${c.autor} <span style="color: var(--dark-blue-gray); font-weight: normal;">(${c.negocio || 'Emprendedor'})</span> - <small style="color: var(--dark-blue-gray);">${c.fecha}</small>
                        </div>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: var(--color-principal);">${c.texto}</p>
                    </div>
                `;
            });

            const autorActual = usuarioLogueado ? usuarioLogueado.nombre : 'Invitado';
            const esElCreador = usuarioLogueado && usuarioLogueado.nombre === pub.usuario;
            const botonEliminarHTML = esElCreador ? `
                <button class="btn-eliminar" data-id="${pub.id}" style="background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; color: #ff6b6b; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                    🗑️ Eliminar
                </button>
            ` : '';

            article.innerHTML = `
                <div class="cabecera-pub">
                    <span class="nombre-usuario" style="color: var(--color-principal);">👤 ${pub.usuario}</span>
                    <span class="nombre-negocio" style="color: var(--dark-blue-gray);">🏢 ${pub.negocio || 'Emprendimiento'}</span>
                    <span class="categoria" style="background: var(--space-cadet); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: var(--amarillo-estrella);">🏷️ ${pub.categoria}</span>
                </div>
                <div class="contenido-pub" style="margin: 15px 0; color: var(--color-principal);">
                    <p>${pub.contenido}</p>
                </div>
                <div class="pie-pub" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid var(--purple-navy); padding-top: 10px;">
                    <button class="btn-like" data-id="${pub.id}" style="background: transparent; border: 1px solid var(--purple-navy); color: var(--color-principal); padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
                        ❤️ Me gusta (<span class="contador-likes">${pub.cantidadMeGusta.toLocaleString()}</span>)
                    </button>
                    ${botonEliminarHTML}
                </div>

                <!-- SECCIÓN DE COMENTARIOS -->
                <div class="seccion-comentarios" style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed var(--purple-navy);">
                    <h4 style="margin: 0 0 10px 0; color: var(--color-principal); font-size: 0.9rem;">💬 Comentarios (${pub.comentarios.length})</h4>
                    
                    <div class="lista-comentarios-${pub.id}">
                        ${comentariosHTML !== '' ? comentariosHTML : '<p class="sin-comentarios" style="font-size: 0.85rem; color: var(--dark-blue-gray); margin-bottom: 10px;">Sé el primero en comentar esta publicación.</p>'}
                    </div>

                    <form class="form-nuevo-comentario" data-id="${pub.id}" style="display: flex; gap: 8px; margin-top: 10px;">
                        <input type="text" class="input-comentario" placeholder="Comentar como ${autorActual}..." required style="flex: 1; padding: 8px 12px; border-radius: 20px; background: var(--color-fondo); color: var(--color-principal); border: 1px solid var(--purple-navy); font-size: 0.85rem; margin-bottom: 0;">
                        <button type="submit" style="background: var(--space-cadet); color: var(--texto-claro); border: 1px solid var(--purple-navy); padding: 6px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; font-weight: bold; width: auto;">
                            Enviar
                        </button>
                    </form>
                </div>
            `;

            seccionPublicaciones.appendChild(article);
            const hr = document.createElement('hr');
            seccionPublicaciones.appendChild(hr);
        });

        activarEventosTarjetas();
    }

    if (formularioCrearPub) {
        formularioCrearPub.addEventListener('submit', (evento) => {
            evento.preventDefault();

            const inputNombre = document.querySelector('#nombre');
            const inputNegocio = document.querySelector('#nombre_negocio');
            const inputCategoria = document.querySelector('#categoria');
            const textareaContenido = document.querySelector('#contenido_publicacion');

            const nombreUsuario = usuarioLogueado ? usuarioLogueado.nombre : (inputNombre ? inputNombre.value.trim() : 'Anónimo');
            const nombreNegocio = usuarioLogueado ? usuarioLogueado.negocio : (inputNegocio ? inputNegocio.value.trim() : 'Mi Negocio');
            const categoriaPub = inputCategoria ? inputCategoria.value.trim() : 'General';
            const contenidoPub = textareaContenido ? textareaContenido.value.trim() : '';

            if (contenidoPub === '') {
                mostrarNotificacion("⚠️ El contenido de la publicación no puede estar vacío.", "error");
                return;
            }

            const nuevaPublicacion = {
                id: Date.now(),
                usuario: nombreUsuario,
                negocio: nombreNegocio,
                contenido: contenidoPub,
                categoria: categoriaPub,
                cantidadMeGusta: 0,
                comentarios: []
            };

            publicaciones.unshift(nuevaPublicacion);
            sincronizarYActualizarPubs();
            formularioCrearPub.reset();
            mostrarNotificacion("🚀 ¡Publicación creada con éxito!", "exito");
        });
    }

    function activarEventosTarjetas() {
        document.querySelectorAll('.btn-like').forEach(boton => {
            boton.addEventListener('click', (e) => {
                const idPub = Number(e.currentTarget.getAttribute('data-id'));
                const pub = publicaciones.find(p => p.id === idPub);
                if (pub) {
                    pub.cantidadMeGusta += 1;
                    sincronizarYActualizarPubs();
                    mostrarNotificacion("✨ ¡Te ha gustado esta publicación!", "info");
                }
            });
        });

        document.querySelectorAll('.btn-eliminar').forEach(boton => {
            boton.addEventListener('click', (e) => {
                const idPub = Number(e.currentTarget.getAttribute('data-id'));
                const pub = publicaciones.find(p => p.id === idPub);

                if (!pub) return;

                if (!usuarioLogueado || usuarioLogueado.nombre !== pub.usuario) {
                    mostrarNotificacion("⚠️ No tienes permisos para eliminar esta publicación.", "error");
                    return;
                }

                publicaciones = publicaciones.filter(p => p.id !== idPub);
                sincronizarYActualizarPubs();
                mostrarNotificacion("🗑️ Publicación eliminada correctamente.", "aviso");
            });
        });

        document.querySelectorAll('.form-nuevo-comentario').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const idPub = Number(e.currentTarget.getAttribute('data-id'));
                const input = e.currentTarget.querySelector('.input-comentario');
                const textoComentario = input.value.trim();

                if (textoComentario === '') return;

                const pub = publicaciones.find(p => p.id === idPub);
                if (pub) {
                    if (!pub.comentarios) pub.comentarios = [];

                    const hoy = new Date();
                    const fechaFormateada = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;

                    const nuevoComentario = {
                        autor: usuarioLogueado ? usuarioLogueado.nombre : 'Emprendedor Anónimo',
                        negocio: usuarioLogueado ? usuarioLogueado.negocio : 'Visitante',
                        texto: textoComentario,
                        fecha: fechaFormateada
                    };

                    pub.comentarios.push(nuevoComentario);
                    sincronizarYActualizarPubs();
                    mostrarNotificacion("💬 Comentario agregado correctamente.", "exito");
                }
            });
        });
    }

    function sincronizarYActualizarPubs() {
        localStorage.setItem('businessSky_publicaciones', JSON.stringify(publicaciones));
        renderizarPublicaciones(publicaciones);
    }

    // --- 5. FILTRADO POR CATEGORÍA ---
    function agregarBarraFiltros() {
        if (!seccionPublicaciones || document.querySelector('#contenedor-filtro-categorias')) return;

        const contenedorFiltro = document.createElement('div');
        contenedorFiltro.id = 'contenedor-filtro-categorias';
        contenedorFiltro.style.cssText = `margin-bottom: 25px; display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap;`;

        // Se usa var(--color-principal) para garantizar total visibilidad en ambos modos
        contenedorFiltro.innerHTML = `
            <label for="select-filtro-cat" style="font-weight: bold; color: var(--color-principal);">Filtrar por categoría:</label>
            <select id="select-filtro-cat" style="padding: 8px 12px; border-radius: 6px; background-color: var(--color-fondo); color: var(--color-principal); border: 1px solid var(--purple-navy);">
                <option value="Todas">Todas las categorías</option>
                <option value="tecnología">Tecnología</option>
                <option value="Personalización de artículos">Personalización de artículos</option>
                <option value="Artesanías">Artesanías</option>
                <option value="Couch en desarrollo personal">Couch en desarrollo personal</option>
                <option value="Gastronomía">Gastronomía</option>
            </select>
        `;

        seccionPublicaciones.parentNode.insertBefore(contenedorFiltro, seccionPublicaciones);

        document.querySelector('#select-filtro-cat').addEventListener('change', (e) => {
            const cat = e.target.value;
            if (cat === "Todas") {
                renderizarPublicaciones(publicaciones);
            } else {
                renderizarPublicaciones(publicaciones.filter(p => p.categoria.toLowerCase() === cat.toLowerCase()));
            }
        });
    }

    // --- 6. MODO OSCURO / CLARO ---
    function inicializarModoOscuro() {
        if (!botonTema) return;

        const darkModeGuardado = localStorage.getItem('businessSky_darkMode') === 'true';
        if (darkModeGuardado) {
            document.body.classList.add('dark-mode');
            botonTema.classList.add('modo-oscuro-activo');
            botonTema.textContent = "✨ Modo claro";
        } else {
            document.body.classList.remove('dark-mode');
            botonTema.classList.remove('modo-oscuro-activo');
            botonTema.textContent = "Modo oscuro";
        }

        botonTema.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const esOscuro = document.body.classList.contains('dark-mode');

            if (esOscuro) {
                botonTema.classList.add('modo-oscuro-activo');
                botonTema.textContent = "✨ Modo claro";
            } else {
                botonTema.classList.remove('modo-oscuro-activo');
                botonTema.textContent = "Modo oscuro";
            }

            localStorage.setItem('businessSky_darkMode', esOscuro);
        });
    }

    // --- 7. NOTIFICACIONES TOAST ---
    function crearContenedorToast() {
        if (document.querySelector('#toast-container')) return;
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `position: fixed; bottom: 25px; right: 25px; z-index: 10000; display: flex; flex-direction: column; gap: 12px;`;
        document.body.appendChild(container);
    }

    function mostrarNotificacion(mensaje, tipo = 'exito') {
        const container = document.querySelector('#toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.textContent = mensaje;

        let colorFondo = 'var(--space-cadet)';
        if (tipo === 'exito') colorFondo = '#10B981';
        if (tipo === 'error') colorFondo = '#EF4444';
        if (tipo === 'info') colorFondo = '#F59E0B';

        toast.style.cssText = `background-color: ${colorFondo}; color: #fff; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); font-size: 0.95rem; font-weight: 600; opacity: 0; transform: translateY(20px); transition: all 0.3s ease;`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // --- 8. SIMULADOR DE ESTADO DE CONEXIÓN ---
    function inicializarEstadoConexion() {
        const seccionPerfil = document.querySelector('#Perfil');
        if (!seccionPerfil || seccionPerfil.querySelector('.estado-conexion-badge')) return;

        const indicador = document.createElement('div');
        indicador.classList.add('estado-conexion-badge');
        indicador.style.cssText = `display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; color: #34D399; margin-top: 12px; cursor: pointer;`;
        indicador.innerHTML = `
            <span class="punto-estado" style="width: 10px; height: 10px; background-color: #10B981; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #10B981;"></span>
            <span class="texto-estado">En línea (Activo)</span>
        `;
        seccionPerfil.appendChild(indicador);

        indicador.addEventListener('click', () => {
            const textoEstado = indicador.querySelector('.texto-estado');
            const puntoEstado = indicador.querySelector('.punto-estado');

            if (textoEstado.textContent.includes('En línea')) {
                textoEstado.textContent = 'Ausente / Descanso';
                puntoEstado.style.backgroundColor = '#F59E0B';
                indicador.style.color = '#FBBF24';
                mostrarNotificacion("💤 Estado cambiado a: Ausente", "info");
            } else {
                textoEstado.textContent = 'En línea (Activo)';
                puntoEstado.style.backgroundColor = '#10B981';
                indicador.style.color = '#34D399';
                mostrarNotificacion("🟢 ¡Estás de nuevo en línea!", "exito");
            }
        });
    }

});