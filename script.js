/* =====================================================
   BUSINESS SKY - script.js
   Etapa 3: Interactividad con JavaScript, arreglos, funciones y DOM
   ===================================================== */

"use strict";


/* ---------- 1. CONSTANTES Y DATOS PRINCIPALES ---------- */

// Nombres con los que se guarda la información en el localStorage del navegador
const CLAVE_PUBLICACIONES = "businessSky_publicaciones";
const CLAVE_TEMA = "businessSky_tema";

// Tiempos en milisegundos (se pueden cambiar sin romper nada)
const DURACION_TOAST = 3000;       // Cuánto tiempo se ve un aviso emergente
const TIEMPO_INACTIVIDAD = 20000;  // Sin actividad durante este tiempo, el estado pasa a "Ausente"
const MAX_TOASTS = 3;              // Máximo de avisos visibles al mismo tiempo
const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

// ARREGLO PRINCIPAL: guarda todas las publicaciones de la red social.
// Cada objeto tiene: id, usuario, negocio, contenido, categoria,
// cantidadMeGusta, meGustaDado, comentarios y fecha.
// Si ya hay datos guardados en el navegador se cargan; si no, se usan los iniciales.
const publicaciones = cargarPublicaciones();

// Variables que recuerdan el estado de la página
let idEnConfirmacion = null;          // Publicación que está pidiendo confirmar su eliminación
const comentariosAbiertos = new Set(); // Publicaciones que tienen su sección de comentarios abierta
const filtros = { categoria: "todas", autor: "todos", orden: "recientes" };
let avisoAlmacenamientoMostrado = false;

// Variables del simulador de estado de conexión
let estadoConexionActual = "";
let temporizadorInactividad = null;
let ultimaActividad = 0;

// Aquí se guardan las referencias a los elementos del HTML (se llenan al iniciar)
const dom = {};


/* ---------- 2. DATOS: CARGAR, NORMALIZAR Y GUARDAR (localStorage) ---------- */

// Publicaciones con las que empieza la red social (las mismas que aparecen en el HTML)
function crearPublicacionesIniciales() {
  const ahora = Date.now();

  return [
    {
      id: 1,
      usuario: "Oliver Queen",
      negocio: "Queen Industries",
      contenido: "Con nosotros tus necesidades están resueltas.\nPorque contamos con una gran variedad de electrodomésticos, dispositivos electrónicos, computadoras y demás que se ajustan a tus necesidades.",
      categoria: "Tecnología",
      cantidadMeGusta: 5400,
      meGustaDado: false,
      comentarios: [],
      fecha: ahora - 1 * MILISEGUNDOS_POR_DIA
    },
    {
      id: 2,
      usuario: "Mónica Retana",
      negocio: "Kairos Desing",
      contenido: "Es un emprendimiento especializado en la personalización de artículos. ¿Tienes una idea? Nosotros la hacemos realidad, desde camisas, tazas y gorras, entre muchos otros productos.",
      categoria: "Personalización de artículos",
      cantidadMeGusta: 7000,
      meGustaDado: false,
      comentarios: [],
      fecha: ahora - 2 * MILISEGUNDOS_POR_DIA
    },
    {
      id: 3,
      usuario: "Anny Álfaro",
      negocio: "Eternal Garden",
      contenido: "Vendemos experiencias que duran por la propia eternidad.\nCon bellas flores de tela y limpiapipas personalizadas a su gusto.",
      categoria: "Artesanías",
      cantidadMeGusta: 7700,
      meGustaDado: false,
      comentarios: [],
      fecha: ahora - 3 * MILISEGUNDOS_POR_DIA
    },
    {
      id: 4,
      usuario: "Donny Obando",
      negocio: "Your destiny is in your hands",
      contenido: "El poder de pensar y crear tu propio futuro no es suerte: se sueña y se actúa. Tú decides a dónde quieres llegar en tu vida.",
      categoria: "Couch en desarrollo personal",
      cantidadMeGusta: 1000000,
      meGustaDado: false,
      comentarios: [],
      fecha: ahora - 4 * MILISEGUNDOS_POR_DIA
    }
  ];
}

// Revisa que un objeto leído del navegador tenga la forma correcta.
// Si le faltan datos importantes devuelve null para descartarlo.
function normalizarPublicacion(dato) {
  if (!dato || typeof dato.usuario !== "string" || typeof dato.contenido !== "string") {
    return null;
  }
  if (!Number.isFinite(Number(dato.id))) {
    return null;
  }

  const comentarios = Array.isArray(dato.comentarios)
    ? dato.comentarios
        .filter(function (comentario) {
          return comentario && typeof comentario.texto === "string";
        })
        .map(function (comentario) {
          return {
            autor: typeof comentario.autor === "string" && comentario.autor ? comentario.autor : "Visitante",
            texto: comentario.texto,
            fecha: Number(comentario.fecha) || Date.now()
          };
        })
    : [];

  return {
    id: Number(dato.id),
    usuario: dato.usuario,
    negocio: typeof dato.negocio === "string" && dato.negocio.trim() ? dato.negocio : "Emprendimiento independiente",
    contenido: dato.contenido,
    categoria: typeof dato.categoria === "string" && dato.categoria.trim() ? dato.categoria : "General",
    cantidadMeGusta: Math.max(0, Math.floor(Number(dato.cantidadMeGusta) || 0)),
    meGustaDado: Boolean(dato.meGustaDado),
    comentarios: comentarios,
    fecha: Number(dato.fecha) || Date.now()
  };
}

// Lee las publicaciones guardadas; si no hay nada (o falla), usa las iniciales
function cargarPublicaciones() {
  try {
    const textoGuardado = localStorage.getItem(CLAVE_PUBLICACIONES);
    if (textoGuardado !== null) {
      const datos = JSON.parse(textoGuardado);
      if (Array.isArray(datos)) {
        return datos.map(normalizarPublicacion).filter(Boolean);
      }
    }
  } catch (error) {
    console.warn("Business Sky: no se pudieron leer las publicaciones guardadas.", error);
  }
  return crearPublicacionesIniciales();
}

// Guarda el arreglo completo en el navegador cada vez que algo cambia
function guardarPublicaciones() {
  try {
    localStorage.setItem(CLAVE_PUBLICACIONES, JSON.stringify(publicaciones));
  } catch (error) {
    console.warn("Business Sky: no se pudieron guardar las publicaciones.", error);
    if (!avisoAlmacenamientoMostrado) {
      avisoAlmacenamientoMostrado = true;
      mostrarToast("No se pudo guardar en este navegador. Los cambios se perderán al recargar.", "error");
    }
  }
}

// Busca una publicación por su id
function obtenerPublicacionPorId(id) {
  return publicaciones.find(function (publicacion) {
    return publicacion.id === id;
  });
}

// Calcula el id de una publicación nueva (el mayor que existe + 1)
function generarNuevoId() {
  const ids = publicaciones.map(function (publicacion) {
    return publicacion.id;
  });
  return Math.max(0, ...ids) + 1;
}


/* ---------- 3. FUNCIONES AUXILIARES ---------- */

// Crea un elemento con su clase y su texto (usa textContent, así que es seguro)
function crearElemento(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}

// Crea un botón que guarda qué acción hace y a cuál publicación pertenece
function crearBoton(texto, clase, accion, id) {
  const boton = crearElemento("button", clase, texto);
  boton.type = "button";
  boton.dataset.accion = accion;
  boton.dataset.id = id;
  return boton;
}

// Crea un párrafo respetando los saltos de línea del texto
function crearParrafoConSaltos(texto) {
  const parrafo = document.createElement("p");
  texto.split("\n").forEach(function (linea, posicion) {
    if (posicion > 0) parrafo.append(document.createElement("br"));
    parrafo.append(document.createTextNode(linea));
  });
  return parrafo;
}

// Pone puntos de miles: 5400 -> "5.400" (como en el diseño original)
function formatearNumero(numero) {
  return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatearFecha(milisegundos) {
  return new Date(milisegundos).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });
}

function formatearFechaHora(milisegundos) {
  return new Date(milisegundos).toLocaleString("es-CR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Convierte un texto en una "clave" para compararlo sin importar mayúsculas ni tildes
// Así "tecnología", "Tecnología" y "Tecnologia" se tratan como la misma categoría
function clavePara(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Deja el texto con la primera letra en mayúscula y sin espacios repetidos
function capitalizar(texto) {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// El nombre del usuario que comenta es el que aparece en el perfil
function obtenerNombreUsuarioActual() {
  const elemento = document.getElementById("texto_nombre");
  const nombre = elemento ? elemento.textContent.trim() : "";
  return nombre || "Visitante";
}


/* ---------- 4. DIBUJAR LAS PUBLICACIONES EN EL DOM ---------- */

// Construye la sección de botones de una publicación (me gusta, comentarios, eliminar)
function crearAcciones(publicacion) {
  const acciones = crearElemento("div", "acciones-pub");

  // Botón de Me gusta (se marca como activo si el usuario ya dio like)
  const botonLike = crearBoton("♥ Me gusta", "boton-accion", "like", publicacion.id);
  botonLike.classList.toggle("activo", publicacion.meGustaDado);
  botonLike.setAttribute("aria-pressed", String(publicacion.meGustaDado));

  // Botón que abre o cierra los comentarios
  const abierto = comentariosAbiertos.has(publicacion.id);
  const botonComentarios = crearBoton(
    "💬 Comentarios (" + publicacion.comentarios.length + ")",
    "boton-accion",
    "comentarios",
    publicacion.id
  );
  botonComentarios.classList.toggle("activo", abierto);
  botonComentarios.setAttribute("aria-expanded", String(abierto));

  acciones.append(botonLike, botonComentarios);

  // Eliminar: primero pide confirmación y después borra
  if (publicacion.id === idEnConfirmacion) {
    const confirmacion = crearElemento("span", "confirmacion-borrado");
    confirmacion.append(
      "¿Eliminar?",
      crearBoton("Sí", "boton-accion boton-peligro", "confirmar-eliminar", publicacion.id),
      crearBoton("No", "boton-accion", "cancelar-eliminar", publicacion.id)
    );
    acciones.append(confirmacion);
  } else {
    acciones.append(crearBoton("Eliminar", "boton-accion boton-peligro", "eliminar", publicacion.id));
  }

  return acciones;
}

// Construye la lista de comentarios y el campo para escribir uno nuevo
function crearSeccionComentarios(publicacion) {
  const seccion = crearElemento("div", "seccion-comentarios");

  if (publicacion.comentarios.length === 0) {
    seccion.append(crearElemento("p", "sin-comentarios", "Aún no hay comentarios. ¡Sé el primero en comentar!"));
  } else {
    const lista = crearElemento("ul", "lista-comentarios");
    publicacion.comentarios.forEach(function (comentario) {
      const item = crearElemento("li", "comentario");
      item.append(
        crearElemento("strong", "comentario-autor", comentario.autor),
        crearElemento("span", "comentario-texto", comentario.texto),
        crearElemento("small", "comentario-fecha", formatearFechaHora(comentario.fecha))
      );
      lista.append(item);
    });
    seccion.append(lista);
  }

  // Se usa un div (y no un form) para no heredar los estilos de los formularios grandes
  const zonaEscritura = crearElemento("div", "formulario-comentario");
  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "campo-comentario";
  campo.placeholder = "Escribe un comentario...";
  campo.maxLength = 200;
  campo.dataset.id = publicacion.id;
  campo.setAttribute("aria-label", "Escribir un comentario en la publicación de " + publicacion.usuario);

  zonaEscritura.append(campo, crearBoton("Comentar", "boton-accion", "comentar", publicacion.id));
  seccion.append(zonaEscritura);

  return seccion;
}

// Construye la tarjeta completa (article) de una publicación
function crearTarjeta(publicacion) {
  const tarjeta = crearElemento("article", "publicacion");
  tarjeta.id = "publicacion-" + publicacion.id;

  // 1) Cabecera: usuario, negocio y categoría
  const cabecera = crearElemento("div", "cabecera-pub");
  cabecera.append(
    crearElemento("span", "nombre-usuario", publicacion.usuario),
    crearElemento("span", "nombre-negocio", publicacion.negocio),
    crearElemento("span", "categoria", publicacion.categoria)
  );

  // 2) Contenido y fecha de publicación
  const contenido = crearElemento("div", "contenido-pub");
  contenido.append(
    crearParrafoConSaltos(publicacion.contenido),
    crearElemento("small", "fecha-pub", "Publicado el " + formatearFecha(publicacion.fecha))
  );

  // 3) Pie: contador de Me gusta y botones
  const pie = crearElemento("div", "pie-pub");
  const bloqueLikes = crearElemento("span", "bloque-likes");
  bloqueLikes.append("❤️ Me gusta: ", crearElemento("span", "contador-likes", formatearNumero(publicacion.cantidadMeGusta)));
  pie.append(bloqueLikes, crearAcciones(publicacion));

  tarjeta.append(cabecera, contenido, pie);

  // 4) Comentarios (solo si la persona los abrió)
  if (comentariosAbiertos.has(publicacion.id)) {
    tarjeta.append(crearSeccionComentarios(publicacion));
  }

  return tarjeta;
}

// Vuelve a dibujar solo UNA tarjeta (no toda la lista).
// Si se indica un selector, el foco del teclado vuelve a ese elemento.
function actualizarTarjeta(id, selectorFoco) {
  const publicacion = obtenerPublicacionPorId(id);
  const tarjetaActual = document.getElementById("publicacion-" + id);
  if (!publicacion || !tarjetaActual) return;

  tarjetaActual.replaceWith(crearTarjeta(publicacion));

  if (selectorFoco) {
    const elemento = document.querySelector("#publicacion-" + id + " " + selectorFoco);
    if (elemento) elemento.focus();
  }
}

// Aplica los filtros de categoría y autor, y después el orden elegido
function obtenerPublicacionesVisibles() {
  const filtradas = publicaciones.filter(function (publicacion) {
    const coincideCategoria = filtros.categoria === "todas" || clavePara(publicacion.categoria) === filtros.categoria;
    const coincideAutor = filtros.autor === "todos" || clavePara(publicacion.usuario) === filtros.autor;
    return coincideCategoria && coincideAutor;
  });
  return ordenarPublicaciones(filtradas);
}

// Ordena una copia de la lista (el arreglo original no se toca)
function ordenarPublicaciones(lista) {
  const copia = lista.slice();

  if (filtros.orden === "populares") {
    // Más "Me gusta" primero; si empatan, la más reciente primero
    copia.sort(function (a, b) {
      return b.cantidadMeGusta - a.cantidadMeGusta || b.fecha - a.fecha;
    });
  } else {
    // Más nuevas primero
    copia.sort(function (a, b) {
      return b.fecha - a.fecha;
    });
  }
  return copia;
}

// Borra lo que hay en pantalla y dibuja de nuevo todas las publicaciones visibles
function mostrarPublicaciones() {
  const visibles = obtenerPublicacionesVisibles();

  dom.listaPublicaciones.innerHTML = "";

  if (visibles.length === 0) {
    const mensaje = publicaciones.length === 0
      ? "Aún no hay publicaciones. ¡Crea la primera!"
      : "No hay publicaciones que coincidan con los filtros elegidos.";
    dom.listaPublicaciones.append(crearElemento("p", "mensaje-vacio-pub", mensaje));
  }

  visibles.forEach(function (publicacion) {
    dom.listaPublicaciones.append(crearTarjeta(publicacion), document.createElement("hr"));
  });

  dom.resumen.textContent = "Mostrando " + visibles.length + " de " + publicaciones.length + " publicaciones";
}


/* ---------- 5. FILTROS Y ORDENAMIENTO ---------- */

// Llena un <select> con una opción "todas" y las opciones indicadas.
// Devuelve el valor que quedó seleccionado.
function llenarSelect(select, valorTodas, textoTodas, opciones, valorActual) {
  select.innerHTML = "";
  select.append(new Option(textoTodas, valorTodas));

  opciones.forEach(function (opcion) {
    select.append(new Option(opcion.texto, opcion.valor));
  });

  const sigueExistiendo = opciones.some(function (opcion) {
    return opcion.valor === valorActual;
  });
  select.value = sigueExistiendo ? valorActual : valorTodas;
  return select.value;
}

// Saca la lista de valores distintos de un campo (categoria o usuario) sin repetir
function obtenerOpcionesUnicas(nombreCampo) {
  const mapa = new Map();

  publicaciones.forEach(function (publicacion) {
    const clave = clavePara(publicacion[nombreCampo]);
    if (!mapa.has(clave)) mapa.set(clave, publicacion[nombreCampo]);
  });

  return Array.from(mapa, function (entrada) {
    return { valor: entrada[0], texto: entrada[1] };
  }).sort(function (a, b) {
    return a.texto.localeCompare(b.texto, "es");
  });
}

// Reconstruye los selectores según las publicaciones que existen hoy
// (así una categoría o autor nuevo aparece solo, y uno que ya no existe desaparece)
function actualizarOpcionesDeFiltros() {
  filtros.categoria = llenarSelect(dom.filtroCategoria, "todas", "Todas las categorías", obtenerOpcionesUnicas("categoria"), filtros.categoria);
  filtros.autor = llenarSelect(dom.filtroAutor, "todos", "Todos los emprendedores", obtenerOpcionesUnicas("usuario"), filtros.autor);
}

// Se ejecuta cuando cambia cualquiera de los tres selectores
function manejarCambioDeFiltros() {
  filtros.categoria = dom.filtroCategoria.value;
  filtros.autor = dom.filtroAutor.value;
  filtros.orden = dom.ordenarPor.value;
  idEnConfirmacion = null;
  mostrarPublicaciones();
}

// Deja los tres selectores como al principio
function restablecerFiltros(mostrarAviso) {
  filtros.categoria = "todas";
  filtros.autor = "todos";
  filtros.orden = "recientes";
  dom.ordenarPor.value = "recientes";

  actualizarOpcionesDeFiltros();
  mostrarPublicaciones();

  if (mostrarAviso) mostrarToast("Filtros restablecidos", "info");
}


/* ---------- 6. FORMULARIO: VALIDAR Y CREAR PUBLICACIONES ---------- */

// Revisa los datos y devuelve una lista con los errores encontrados
function validarDatosPublicacion(datos) {
  const errores = [];
  const formatoNombre = /^[\p{L}\p{N}\s.&'’-]+$/u;

  // Nombre del usuario: obligatorio, entre 3 y 40 caracteres, con formato válido
  if (datos.usuario === "") {
    errores.push({ campo: dom.campoNombre, mensaje: "⚠ El nombre es obligatorio." });
  } else if (datos.usuario.length < 3) {
    errores.push({ campo: dom.campoNombre, mensaje: "⚠ El nombre debe tener al menos 3 caracteres." });
  } else if (datos.usuario.length > 40) {
    errores.push({ campo: dom.campoNombre, mensaje: "⚠ El nombre no puede pasar de 40 caracteres." });
  } else if (!formatoNombre.test(datos.usuario)) {
    errores.push({ campo: dom.campoNombre, mensaje: "⚠ El nombre solo puede tener letras, números y . & ' -" });
  }

  // Negocio: es opcional, pero si se escribe no puede ser larguísimo
  if (datos.negocio.length > 50) {
    errores.push({ campo: dom.campoNegocio, mensaje: "⚠ El nombre del negocio no puede pasar de 50 caracteres." });
  }

  // Categoría: obligatoria, entre 3 y 40 caracteres y con al menos una letra
  if (datos.categoria === "") {
    errores.push({ campo: dom.campoCategoria, mensaje: "⚠ Selecciona o escribe una categoría." });
  } else if (datos.categoria.length < 3 || datos.categoria.length > 40) {
    errores.push({ campo: dom.campoCategoria, mensaje: "⚠ La categoría debe tener entre 3 y 40 caracteres." });
  } else if (!/\p{L}/u.test(datos.categoria)) {
    errores.push({ campo: dom.campoCategoria, mensaje: "⚠ La categoría debe incluir letras." });
  }

  // Contenido: obligatorio, entre 10 y 500 caracteres y con al menos una letra
  if (datos.contenido === "") {
    errores.push({ campo: dom.campoContenido, mensaje: "⚠ El contenido es obligatorio." });
  } else if (datos.contenido.length < 10) {
    errores.push({ campo: dom.campoContenido, mensaje: "⚠ El contenido debe tener al menos 10 caracteres." });
  } else if (datos.contenido.length > 500) {
    errores.push({ campo: dom.campoContenido, mensaje: "⚠ El contenido no puede pasar de 500 caracteres." });
  } else if (!/\p{L}/u.test(datos.contenido)) {
    errores.push({ campo: dom.campoContenido, mensaje: "⚠ El contenido debe incluir texto, no solo símbolos o números." });
  }

  return errores;
}

// Se ejecuta cuando el usuario envía el formulario
function manejarEnvioFormulario(evento) {
  evento.preventDefault(); // Evita que la página se recargue

  // 1) Capturar los datos (trim quita los espacios sobrantes)
  const datos = {
    usuario: dom.campoNombre.value.trim(),
    negocio: dom.campoNegocio.value.trim(),
    categoria: dom.campoCategoria.value.trim(),
    contenido: dom.campoContenido.value.trim()
  };

  // 2) Limpiar marcas de errores anteriores y validar
  [dom.campoNombre, dom.campoNegocio, dom.campoCategoria, dom.campoContenido].forEach(function (campo) {
    campo.classList.remove("campo-invalido");
  });
  const errores = validarDatosPublicacion(datos);

  if (errores.length > 0) {
    errores.forEach(function (error) {
      error.campo.classList.add("campo-invalido");
    });
    const extra = errores.length > 1 ? " (y " + (errores.length - 1) + " más)" : "";
    mostrarToast(errores[0].mensaje + extra, "error");
    errores[0].campo.focus();
    return; // Si hay errores no se crea nada
  }

  // 3) Crear el objeto y agregarlo al inicio del arreglo
  const nueva = {
    id: generarNuevoId(),
    usuario: datos.usuario,
    negocio: datos.negocio || "Emprendimiento independiente",
    contenido: datos.contenido,
    categoria: capitalizar(datos.categoria),
    cantidadMeGusta: 0,
    meGustaDado: false,
    comentarios: [],
    fecha: Date.now()
  };
  publicaciones.unshift(nueva);
  guardarPublicaciones();

  // 4) Mostrar todo de nuevo (sin filtros, para que la nueva se vea) y limpiar el formulario
  dom.formulario.reset();
  restablecerFiltros(false);

  // 5) Avisar, llevar la vista hasta la publicación y resaltarla un momento
  mostrarToast("¡Publicación creada con éxito!", "exito");
  const tarjetaNueva = document.getElementById("publicacion-" + nueva.id);
  if (tarjetaNueva) {
    tarjetaNueva.classList.add("publicacion-nueva");
    if (typeof tarjetaNueva.scrollIntoView === "function") {
      tarjetaNueva.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}


/* ---------- 7. ME GUSTA, COMENTARIOS Y ELIMINAR ---------- */

// Me gusta: se puede dar y quitar. Se actualiza el arreglo y la pantalla.
function alternarMeGusta(id) {
  const publicacion = obtenerPublicacionPorId(id);
  if (!publicacion) return;

  if (publicacion.meGustaDado) {
    publicacion.meGustaDado = false;
    publicacion.cantidadMeGusta = Math.max(0, publicacion.cantidadMeGusta - 1);
    mostrarToast("Quitaste tu Me gusta", "info");
  } else {
    publicacion.meGustaDado = true;
    publicacion.cantidadMeGusta++;
    mostrarToast("¡Te gustó la publicación de " + publicacion.usuario + "!", "exito");
  }

  guardarPublicaciones();
  // Solo se redibuja esta tarjeta: así no salta de lugar aunque se ordene por popularidad
  actualizarTarjeta(id, '[data-accion="like"]');
}

// Abre o cierra la sección de comentarios de una publicación
function alternarComentarios(id) {
  if (comentariosAbiertos.has(id)) {
    comentariosAbiertos.delete(id);
    actualizarTarjeta(id, '[data-accion="comentarios"]');
  } else {
    comentariosAbiertos.add(id);
    actualizarTarjeta(id, ".campo-comentario");
  }
}

// Agrega un comentario nuevo a una publicación
function agregarComentario(id) {
  const publicacion = obtenerPublicacionPorId(id);
  const campo = document.querySelector("#publicacion-" + id + " .campo-comentario");
  if (!publicacion || !campo) return;

  const texto = campo.value.trim();

  if (texto.length < 2) {
    mostrarToast("⚠ Escribe un comentario de al menos 2 caracteres.", "error");
    campo.focus();
    return;
  }
  if (texto.length > 200) {
    mostrarToast("⚠ El comentario no puede pasar de 200 caracteres.", "error");
    campo.focus();
    return;
  }

  publicacion.comentarios.push({
    autor: obtenerNombreUsuarioActual(),
    texto: texto,
    fecha: Date.now()
  });
  guardarPublicaciones();

  comentariosAbiertos.add(id);
  actualizarTarjeta(id, ".campo-comentario");
  mostrarToast("Comentario agregado", "exito");
}

// Primer paso de eliminar: la tarjeta pregunta "¿Eliminar? Sí / No"
function pedirConfirmacion(id) {
  const anterior = idEnConfirmacion;
  idEnConfirmacion = id;

  if (anterior !== null && anterior !== id) actualizarTarjeta(anterior);
  actualizarTarjeta(id, '[data-accion="cancelar-eliminar"]');
}

function cancelarEliminacion(id) {
  idEnConfirmacion = null;
  actualizarTarjeta(id, '[data-accion="eliminar"]');
}

// Segundo paso: se borra del arreglo y del DOM
function eliminarPublicacion(id) {
  const posicion = publicaciones.findIndex(function (publicacion) {
    return publicacion.id === id;
  });
  if (posicion === -1) return;

  publicaciones.splice(posicion, 1); // Se quita del arreglo
  comentariosAbiertos.delete(id);
  idEnConfirmacion = null;
  guardarPublicaciones();

  actualizarOpcionesDeFiltros(); // Por si ya no queda esa categoría o ese autor
  mostrarPublicaciones();        // Se vuelve a dibujar, así desaparece del DOM
  mostrarToast("Publicación eliminada", "info");
}

// Un solo "escuchador" atiende los botones de todas las tarjetas (delegación de eventos)
function manejarClicEnLista(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const id = Number(boton.dataset.id);

  switch (boton.dataset.accion) {
    case "like":
      alternarMeGusta(id);
      break;
    case "comentarios":
      alternarComentarios(id);
      break;
    case "comentar":
      agregarComentario(id);
      break;
    case "eliminar":
      pedirConfirmacion(id);
      break;
    case "confirmar-eliminar":
      eliminarPublicacion(id);
      break;
    case "cancelar-eliminar":
      cancelarEliminacion(id);
      break;
  }
}

// Permite enviar un comentario presionando Enter
function manejarTeclaEnLista(evento) {
  if (evento.key !== "Enter") return;

  const campo = evento.target.closest(".campo-comentario");
  if (!campo) return;

  evento.preventDefault();
  agregarComentario(Number(campo.dataset.id));
}


/* ---------- 8. NOTIFICACIONES "TOAST" ---------- */
function mostrarToast(mensaje, tipo) {
  if (!dom.contenedorToasts) return;

  // Si ya hay muchos avisos, se quita el más viejo
  while (dom.contenedorToasts.children.length >= MAX_TOASTS) {
    dom.contenedorToasts.firstElementChild.remove();
  }

  const toast = crearElemento("div", "toast toast-" + (tipo || "info"), mensaje);
  dom.contenedorToasts.append(toast);

  // Se agrega la clase en el siguiente cuadro para que se vea la animación de entrada
  requestAnimationFrame(function () {
    toast.classList.add("toast-visible");
  });

  // Pasado el tiempo, se desvanece y se elimina
  setTimeout(function () {
    toast.classList.remove("toast-visible");
    setTimeout(function () {
      toast.remove();
    }, 400);
  }, DURACION_TOAST);
}


/* ---------- 9. MODO OSCURO / CLARO ---------- */

// Aplica el tema. "dark-mode" es la clase que usa tu CSS; "modo-claro" es la clase
// inversa que solo se usa para los estilos del modo claro.
function aplicarTema(esOscuro) {
  document.body.classList.toggle("dark-mode", esOscuro);
  document.body.classList.toggle("modo-claro", !esOscuro);

  dom.botonTema.textContent = esOscuro ? "Modo claro" : "Modo oscuro";
  dom.botonTema.setAttribute("aria-pressed", String(esOscuro));
}

function guardarTema(esOscuro) {
  try {
    localStorage.setItem(CLAVE_TEMA, esOscuro ? "oscuro" : "claro");
  } catch (error) {
    console.warn("Business Sky: no se pudo guardar el tema.", error);
  }
}

// Al abrir la página se usa el tema guardado; la primera vez se empieza en oscuro
function cargarTemaGuardado() {
  let temaGuardado = "oscuro";
  try {
    temaGuardado = localStorage.getItem(CLAVE_TEMA) || "oscuro";
  } catch (error) {
    temaGuardado = "oscuro";
  }
  aplicarTema(temaGuardado !== "claro");
}

function alternarTema() {
  const pasaAOscuro = !document.body.classList.contains("dark-mode");
  aplicarTema(pasaAOscuro);
  guardarTema(pasaAOscuro);
  mostrarToast(pasaAOscuro ? "Modo oscuro activado" : "Modo claro activado", "info");
}


/* ---------- 10. SIMULADOR DE ESTADO DE CONEXIÓN ---------- */

// Los tres estados posibles del usuario
const ESTADOS_CONEXION = {
  activo: { texto: "Activo ahora", clase: "estado-activo" },
  inactivo: { texto: "Ausente", clase: "estado-inactivo" },
  sinConexion: { texto: "Sin conexión", clase: "estado-sin-conexion" }
};

// Crea el indicador (punto + texto) dentro de la cabecera del perfil
function crearIndicadorEstado() {
  const cabeceraPerfil = document.querySelector(".Perfil_cabecera");
  if (!cabeceraPerfil) return false;

  const indicador = crearElemento("span", "estado-conexion");
  indicador.id = "estado_conexion";
  indicador.setAttribute("role", "status");
  indicador.append(crearElemento("span", "punto-estado"), crearElemento("span", "texto-estado"));

  const nombreUsuario = document.getElementById("nombre_usuario");
  if (nombreUsuario) {
    nombreUsuario.after(indicador);
  } else {
    cabeceraPerfil.append(indicador);
  }

  dom.indicadorEstado = indicador;
  return true;
}

// Cambia el estado que se muestra (solo si realmente cambió)
function establecerEstado(nombreEstado) {
  if (!dom.indicadorEstado || nombreEstado === estadoConexionActual) return;

  const estado = ESTADOS_CONEXION[nombreEstado];
  estadoConexionActual = nombreEstado;

  dom.indicadorEstado.className = "estado-conexion " + estado.clase;
  dom.indicadorEstado.querySelector(".texto-estado").textContent = estado.texto;
  dom.indicadorEstado.title = "Estado del usuario: " + estado.texto;
}

// Cada vez que haya actividad, el usuario pasa a "Activo" y se reinicia el reloj
function registrarActividad() {
  if (!navigator.onLine) return;

  const ahora = Date.now();
  // Para no trabajar de más, se ignora la actividad repetida en menos de 1 segundo
  if (estadoConexionActual === "activo" && ahora - ultimaActividad < 1000) return;

  ultimaActividad = ahora;
  establecerEstado("activo");

  clearTimeout(temporizadorInactividad);
  temporizadorInactividad = setTimeout(function () {
    establecerEstado("inactivo");
  }, TIEMPO_INACTIVIDAD);
}

function iniciarSimuladorDeConexion() {
  if (!crearIndicadorEstado()) return;

  // Eventos que cuentan como "el usuario está activo"
  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(function (nombreEvento) {
    window.addEventListener(nombreEvento, registrarActividad, { passive: true });
  });

  // Si cambia de pestaña, queda como ausente; al volver, vuelve a estar activo
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearTimeout(temporizadorInactividad);
      establecerEstado("inactivo");
    } else {
      registrarActividad();
    }
  });

  // Si se pierde o vuelve el internet
  window.addEventListener("offline", function () {
    clearTimeout(temporizadorInactividad);
    establecerEstado("sinConexion");
  });
  window.addEventListener("online", function () {
    ultimaActividad = 0;
    registrarActividad();
  });

  // Estado inicial
  if (navigator.onLine) {
    registrarActividad();
  } else {
    establecerEstado("sinConexion");
  }
}


/* ---------- 11. PREPARAR LA INTERFAZ ---------- */

// Busca en el HTML los elementos que necesita el script.
// Si falta alguno, avisa en la consola y no se inicia nada (así no hay errores confusos).
function buscarElementos() {
  dom.seccionPublicaciones = document.getElementById("Publicaciones");
  dom.formulario = document.getElementById("Formulario_Publicacion");
  dom.campoNombre = document.getElementById("nombre");
  dom.campoNegocio = document.getElementById("nombre_negocio");
  dom.campoCategoria = document.getElementById("categoria");
  dom.campoContenido = document.getElementById("contenido_publicacion");
  dom.botonTema = document.getElementById("boton_Tema");

  const faltantes = Object.keys(dom).filter(function (clave) {
    return !dom[clave];
  });

  if (faltantes.length > 0) {
    console.error("Business Sky: no se encontraron estos elementos del HTML:", faltantes.join(", "));
    return false;
  }
  return true;
}

// Crea (con JavaScript) la barra de filtros, el resumen, la lista y el contenedor de avisos
function construirInterfaz() {
  // Se vacía la sección: las publicaciones del HTML se reemplazan por las del arreglo
  dom.seccionPublicaciones.innerHTML = "";

  const barra = document.createElement("div");
  barra.className = "barra-herramientas";
  barra.id = "barra_herramientas";
  barra.innerHTML =
    '<div class="grupo-herramienta">' +
      '<label for="filtro_categoria">Categoría</label>' +
      '<select id="filtro_categoria"></select>' +
    '</div>' +
    '<div class="grupo-herramienta">' +
      '<label for="filtro_autor">Emprendedor</label>' +
      '<select id="filtro_autor"></select>' +
    '</div>' +
    '<div class="grupo-herramienta">' +
      '<label for="ordenar_por">Ordenar por</label>' +
      '<select id="ordenar_por">' +
        '<option value="recientes">Más recientes</option>' +
        '<option value="populares">Más populares</option>' +
      '</select>' +
    '</div>' +
    '<button type="button" id="boton_limpiar_filtros" class="boton-accion">Limpiar filtros</button>';

  const resumen = crearElemento("p", "resumen-resultados");
  resumen.id = "resumen_resultados";
  resumen.setAttribute("aria-live", "polite");

  const lista = document.createElement("div");
  lista.id = "lista_publicaciones";

  dom.seccionPublicaciones.append(barra, resumen, lista);

  dom.filtroCategoria = barra.querySelector("#filtro_categoria");
  dom.filtroAutor = barra.querySelector("#filtro_autor");
  dom.ordenarPor = barra.querySelector("#ordenar_por");
  dom.botonLimpiar = barra.querySelector("#boton_limpiar_filtros");
  dom.resumen = resumen;
  dom.listaPublicaciones = lista;

  // Contenedor donde aparecen los avisos emergentes
  const contenedorToasts = document.createElement("div");
  contenedorToasts.id = "contenedor_toasts";
  contenedorToasts.setAttribute("aria-live", "polite");
  document.body.append(contenedorToasts);
  dom.contenedorToasts = contenedorToasts;
}

// Conecta cada evento con su función
function conectarEventos() {
  // Se desactiva la validación automática del navegador para usar la nuestra
  dom.formulario.noValidate = true;
  dom.formulario.addEventListener("submit", manejarEnvioFormulario);

  // Cuando se escribe en un campo marcado con error, se quita la marca
  [dom.campoNombre, dom.campoNegocio, dom.campoCategoria, dom.campoContenido].forEach(function (campo) {
    campo.addEventListener("input", function () {
      campo.classList.remove("campo-invalido");
    });
  });

  dom.listaPublicaciones.addEventListener("click", manejarClicEnLista);
  dom.listaPublicaciones.addEventListener("keydown", manejarTeclaEnLista);

  [dom.filtroCategoria, dom.filtroAutor, dom.ordenarPor].forEach(function (select) {
    select.addEventListener("change", manejarCambioDeFiltros);
  });
  dom.botonLimpiar.addEventListener("click", function () {
    restablecerFiltros(true);
  });

  dom.botonTema.addEventListener("click", alternarTema);
}

function iniciarAplicacion() {
  if (!buscarElementos()) return;

  construirInterfaz();
  conectarEventos();
  cargarTemaGuardado();
  actualizarOpcionesDeFiltros();
  mostrarPublicaciones();
  iniciarSimuladorDeConexion();
}

// Si el HTML ya está cargado se inicia de inmediato; si no, se espera a que termine
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarAplicacion);
} else {
  iniciarAplicacion();
}