/*(Específico para el flujo de pago, calcular envío a Ate y validar datos)*/

/* ==========================================================================
   carrito.js - Renderizado del carrito y envío por WhatsApp
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const contenedorItems = document.getElementById('carrito-items');
    const subtotalPrecioElement = document.getElementById('subtotal-precio');
    const envioPrecioElement = document.getElementById('envio-precio');
    const totalPrecioElement = document.getElementById('total-precio');
    const formCheckout = document.getElementById('checkout-form');
    const ubicacionMapsInput = document.getElementById('ubicacion-maps');
    const estadoUbicacionElement = document.getElementById('estado-ubicacion');
    const fechaEntregaInput = document.getElementById('fecha-entrega');
    const coordenadasOrigenMotorizado = { lat: -12.024136, lng: -76.882107 };

    let subtotalProductos = 0;
    let costoMotorizado = 0;
    let detalleUbicacionSeleccionada = null;
    let temporizadorProcesamientoUbicacion = null;
    let secuenciaProcesamientoUbicacion = 0;

    function formatearFechaISO(fecha) {
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${anio}-${mes}-${dia}`;
    }

    function obtenerFechaMinimaEntrega() {
        const fechaMinima = new Date();
        fechaMinima.setHours(0, 0, 0, 0);
        fechaMinima.setDate(fechaMinima.getDate() + 2);
        return fechaMinima;
    }

    const fechaMinimaEntrega = obtenerFechaMinimaEntrega();

    function configurarCalendarioEntrega() {
        if (!fechaEntregaInput) return;
        fechaEntregaInput.min = formatearFechaISO(fechaMinimaEntrega);
    }

    function obtenerURLValida(textoURL) {
        const valor = (textoURL || '').trim();
        if (!valor) return null;

        try {
            return new URL(valor);
        } catch (error) {
            if (!valor.startsWith('www.')) {
                return null;
            }

            try {
                return new URL(`https://${valor}`);
            } catch (errorURL) {
                return null;
            }
        }
    }

    function esEnlaceCortoGoogleMaps(url) {
        if (!url) return false;
        const host = url.hostname.toLowerCase();
        return host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps'));
    }

    function extraerPrimerEnlace(texto) {
        if (!texto) return null;
        const coincidencia = texto.match(/https?:\/\/[^\s<>"]+/i);
        return coincidencia ? coincidencia[0].trim() : null;
    }

    async function expandirEnlaceCortoGoogleMaps(enlaceCorto) {
        const endpointExpansion = `https://unshorten.me/s/${encodeURI(enlaceCorto)}`;
        const respuesta = await fetch(endpointExpansion, {
            method: 'GET',
            cache: 'no-store'
        });

        if (!respuesta.ok) {
            throw new Error('No se pudo expandir el enlace corto de Google Maps.');
        }

        const contenidoRespuesta = (await respuesta.text()).trim();
        return extraerPrimerEnlace(contenidoRespuesta) || contenidoRespuesta;
    }

    function esCoordenadaValida(latitud, longitud) {
        return Number.isFinite(latitud) && Number.isFinite(longitud)
            && latitud >= -90 && latitud <= 90
            && longitud >= -180 && longitud <= 180;
    }

    function extraerCoordenadasDesdeTexto(texto) {
        if (!texto) return null;

        let textoDecodificado = texto;
        try {
            textoDecodificado = decodeURIComponent(texto);
        } catch (error) {
            textoDecodificado = texto;
        }

        const coincidencia = textoDecodificado.match(/([+-]?\d+(?:\.\d+)?)\s*,\s*\+?([+-]?\d+(?:\.\d+)?)/);
        if (!coincidencia) return null;

        const latitud = Number.parseFloat(coincidencia[1]);
        const longitud = Number.parseFloat(coincidencia[2]);

        if (!esCoordenadaValida(latitud, longitud)) return null;

        return { latitud, longitud };
    }

    function extraerCoordenadasDesdeMaps(enlaceMaps) {
        if (!enlaceMaps) return null;

        const enlace = enlaceMaps.trim();
        if (!enlace) return null;

        let enlaceDecodificado = enlace;
        try {
            enlaceDecodificado = decodeURIComponent(enlace);
        } catch (error) {
            enlaceDecodificado = enlace;
        }

        const coordenadasArroba = enlaceDecodificado.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
        if (coordenadasArroba) {
            const latitud = Number.parseFloat(coordenadasArroba[1]);
            const longitud = Number.parseFloat(coordenadasArroba[2]);
            if (esCoordenadaValida(latitud, longitud)) {
                return { latitud, longitud };
            }
        }

        const coordenadas3d4d = enlaceDecodificado.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
        if (coordenadas3d4d) {
            const latitud = Number.parseFloat(coordenadas3d4d[1]);
            const longitud = Number.parseFloat(coordenadas3d4d[2]);
            if (esCoordenadaValida(latitud, longitud)) {
                return { latitud, longitud };
            }
        }

        let url;
        try {
            url = new URL(enlace);
        } catch (error) {
            if (enlace.startsWith('www.')) {
                try {
                    url = new URL(`https://${enlace}`);
                } catch (urlError) {
                    return null;
                }
            } else {
                return null;
            }
        }

        const parametrosCompatibles = ['q', 'query', 'll', 'destination', 'daddr'];

        for (const parametro of parametrosCompatibles) {
            const valorParametro = url.searchParams.get(parametro);
            const coordenadas = extraerCoordenadasDesdeTexto(valorParametro);
            if (coordenadas) {
                return coordenadas;
            }
        }

        return extraerCoordenadasDesdeTexto(enlaceDecodificado);
    }

    function convertirARadianes(valor) {
        return (valor * Math.PI) / 180;
    }

    function calcularDistanciaEnKm(origen, destino) {
        const radioTierraKm = 6371;
        const dLat = convertirARadianes(destino.latitud - origen.lat);
        const dLng = convertirARadianes(destino.longitud - origen.lng);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(convertirARadianes(origen.lat)) *
            Math.cos(convertirARadianes(destino.latitud)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return radioTierraKm * c;
    }

    function calcularCostoMotorizadoPorDistancia(distanciaKm) {
        if (distanciaKm <= 3) return 6;
        if (distanciaKm <= 6) return 8;
        if (distanciaKm <= 10) return 10;
        if (distanciaKm <= 15) return 14;
        if (distanciaKm <= 20) return 18;
        return 22;
    }

    function actualizarEstadoUbicacion(mensaje, tipo) {
        if (!estadoUbicacionElement) return;

        estadoUbicacionElement.textContent = mensaje;
        estadoUbicacionElement.classList.remove('estado-ubicacion--ok', 'estado-ubicacion--warning');

        if (tipo === 'ok') {
            estadoUbicacionElement.classList.add('estado-ubicacion--ok');
            return;
        }

        estadoUbicacionElement.classList.add('estado-ubicacion--warning');
    }

    async function procesarUbicacionMaps() {
        if (!ubicacionMapsInput) return;

        const enlaceMaps = ubicacionMapsInput.value.trim();
        const secuenciaActual = ++secuenciaProcesamientoUbicacion;

        if (!enlaceMaps) {
            detalleUbicacionSeleccionada = null;
            costoMotorizado = 0;
            ubicacionMapsInput.setCustomValidity('Pega un enlace de Google Maps para calcular el motorizado.');
            actualizarEstadoUbicacion('Aun no tenemos una ubicacion valida para estimar el motorizado.', 'warning');
            actualizarTotales();
            return;
        }

        const urlIngresada = obtenerURLValida(enlaceMaps);
        if (!urlIngresada) {
            detalleUbicacionSeleccionada = null;
            costoMotorizado = 0;
            ubicacionMapsInput.setCustomValidity('Ingresa un enlace valido de Google Maps.');
            actualizarEstadoUbicacion('El enlace no es valido. Copia y pega nuevamente el enlace de ubicacion desde Google Maps.', 'warning');
            actualizarTotales();
            return;
        }

        let enlaceAProcesar = enlaceMaps;

        if (esEnlaceCortoGoogleMaps(urlIngresada)) {
            actualizarEstadoUbicacion('Detectamos un enlace corto. Estamos obteniendo la ubicacion exacta...', 'warning');

            try {
                enlaceAProcesar = await expandirEnlaceCortoGoogleMaps(enlaceMaps);
            } catch (error) {
                if (secuenciaActual !== secuenciaProcesamientoUbicacion) {
                    return;
                }

                detalleUbicacionSeleccionada = null;
                costoMotorizado = 0;
                ubicacionMapsInput.setCustomValidity('No pudimos abrir el enlace corto de Google Maps.');
                actualizarEstadoUbicacion('No se pudo abrir el enlace corto. Abre ese enlace en una pestaña, copia la URL completa final y pegala aqui.', 'warning');
                actualizarTotales();
                return;
            }
        }

        const coordenadas = extraerCoordenadasDesdeMaps(enlaceAProcesar);

        if (secuenciaActual !== secuenciaProcesamientoUbicacion) {
            return;
        }

        if (!coordenadas) {
            detalleUbicacionSeleccionada = null;
            costoMotorizado = 0;
            ubicacionMapsInput.setCustomValidity('No se pudo leer la ubicacion del enlace. Copia un enlace de Google Maps que incluya coordenadas.');
            actualizarEstadoUbicacion('No pudimos leer coordenadas del enlace. Abre Google Maps desde el boton, usa "Compartir" y pega el enlace completo.', 'warning');
            actualizarTotales();
            return;
        }

        ubicacionMapsInput.setCustomValidity('');
        const distanciaKm = calcularDistanciaEnKm(coordenadasOrigenMotorizado, coordenadas);
        costoMotorizado = calcularCostoMotorizadoPorDistancia(distanciaKm);
        detalleUbicacionSeleccionada = {
            enlace: enlaceMaps,
            latitud: coordenadas.latitud,
            longitud: coordenadas.longitud,
            distanciaKm
        };

        actualizarEstadoUbicacion(
            `Ubicacion detectada: ${distanciaKm.toFixed(1)} km desde nuestra base de despacho. Motorizado estimado: S/ ${costoMotorizado.toFixed(2)}.`,
            'ok'
        );
        actualizarTotales();
    }

    function actualizarTotales() {
        const totalEstimado = subtotalProductos + costoMotorizado;

        if (subtotalPrecioElement) {
            subtotalPrecioElement.textContent = `S/ ${subtotalProductos.toFixed(2)}`;
        }

        if (envioPrecioElement) {
            envioPrecioElement.textContent = `S/ ${costoMotorizado.toFixed(2)}`;
        }

        totalPrecioElement.textContent = `S/ ${totalEstimado.toFixed(2)}`;
    }

    function esFechaEntregaValida(valorFecha) {
        if (!valorFecha) return false;
        const fechaElegida = new Date(`${valorFecha}T00:00:00`);
        return fechaElegida >= fechaMinimaEntrega;
    }

    function validarFechaEntrega() {
        if (!fechaEntregaInput || !fechaEntregaInput.value) return;

        if (!esFechaEntregaValida(fechaEntregaInput.value)) {
            fechaEntregaInput.setCustomValidity('La fecha de entrega debe ser como minimo 2 dias despues del pedido.');
            fechaEntregaInput.reportValidity();
        } else {
            fechaEntregaInput.setCustomValidity('');
        }
    }

    // 1. Función para pintar los productos guardados en pantalla
    function renderizarCarrito() {
        contenedorItems.innerHTML = ''; // Limpiar contenedor
        let total = 0;

        if (carrito.length === 0) {
            contenedorItems.innerHTML = '<p>Tu carrito está vacío. ¡Anímate a ver nuestro catálogo!</p>';
            subtotalProductos = 0;
            actualizarTotales();
            return;
        }

        carrito.forEach((item, index) => {
            total += item.precio;
            
            // Textos adicionales si personalizó el pedido
            let extras = `Color de caja: ${item.colorCaja}`;
            if (item.chocolates) extras += ' | Extra: Chocolates incluidos';
            if (item.dedicatoria) extras += ` | Dedicatoria: "${item.dedicatoria}"`;

            // Crear el HTML de cada item
            const itemHTML = `
                <div class="item-carrito">
                    <div class="item-info">
                        <h4>${item.nombre}</h4>
                        <p>${extras}</p>
                    </div>
                    <div class="item-precio">
                        S/ ${item.precio.toFixed(2)}
                        <button onclick="eliminarItem(${index})" style="margin-left: 15px; color: #E5989B; background: none; border: none; cursor: pointer;" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            contenedorItems.innerHTML += itemHTML;
        });

        subtotalProductos = total;
        actualizarTotales();
    }

    // 2. Función global para poder eliminar un producto dando clic al tacho de basura
    window.eliminarItem = function(index) {
        carrito.splice(index, 1); // Quitar del array
        localStorage.setItem('carritoDM', JSON.stringify(carrito)); // Guardar cambios
        renderizarCarrito(); // Volver a pintar
        actualizarContadorCarrito(); // Actualizar bolita de arriba
    };

    function programarProcesamientoUbicacion() {
        if (temporizadorProcesamientoUbicacion) {
            clearTimeout(temporizadorProcesamientoUbicacion);
        }

        temporizadorProcesamientoUbicacion = setTimeout(() => {
            procesarUbicacionMaps();
        }, 500);
    }

    if (ubicacionMapsInput) {
        ubicacionMapsInput.addEventListener('input', programarProcesamientoUbicacion);
        ubicacionMapsInput.addEventListener('change', () => {
            procesarUbicacionMaps();
        });
    }

    if (fechaEntregaInput) {
        fechaEntregaInput.addEventListener('change', validarFechaEntrega);
    }

    configurarCalendarioEntrega();
    procesarUbicacionMaps();

    // Llamar a la función para pintar el carrito al entrar a la página
    renderizarCarrito();
    actualizarTotales();

    // 3. Lógica final: Procesar el pago rápido y enviar WhatsApp
    formCheckout.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitar que la página se recargue

        if (carrito.length === 0) {
            alert('Agrega al menos un arreglo a tu carrito antes de continuar.');
            return;
        }

        // Obtener los datos del formulario
        const nombre = document.getElementById('nombre-cliente').value.trim();
        const telefono = document.getElementById('telefono-cliente').value.trim();
        const direccion = document.getElementById('direccion-cliente').value.trim();
        const ubicacionMaps = ubicacionMapsInput ? ubicacionMapsInput.value.trim() : '';
        const fecha = fechaEntregaInput.value;
        const metodoPago = document.querySelector('input[name="pago"]:checked').value;

        if (!esFechaEntregaValida(fecha)) {
            alert('La fecha de entrega debe ser como minimo 2 dias despues del pedido.');
            return;
        }

        await procesarUbicacionMaps();

        if (!detalleUbicacionSeleccionada) {
            alert('Para calcular el motorizado con precision, pega un enlace valido de Google Maps en tu ubicacion de entrega.');
            if (ubicacionMapsInput) {
                ubicacionMapsInput.focus();
                ubicacionMapsInput.reportValidity();
            }
            return;
        }

        // Construir el mensaje para WhatsApp
        let mensaje = '*Hola D&M Detalles! Vengo de la web y quiero confirmar un pedido:*\n\n';
        mensaje += `*DATOS DEL CLIENTE:*\n- Nombre: ${nombre}\n- Teléfono: ${telefono}\n- Dirección (Ate): ${direccion}\n- Ubicación Maps: ${ubicacionMaps}\n- Distancia estimada desde base de despacho: ${detalleUbicacionSeleccionada.distanciaKm.toFixed(1)} km\n- Fecha de Entrega solicitada: ${fecha}\n- Método de Pago: ${metodoPago.toUpperCase()}\n\n`;
        
        mensaje += '*DETALLE DEL PEDIDO:*\n';
        let totalFinal = 0;
        
        carrito.forEach(item => {
            const dedicatoria = item.dedicatoria ? item.dedicatoria : 'Sin dedicatoria';
            mensaje += `- ${item.nombre} (S/ ${item.precio.toFixed(2)})\n`;
            mensaje += `  Caja: ${item.colorCaja} ${item.chocolates ? '| + Chocolates' : ''}\n`;
            mensaje += `  Mensaje tarjeta: "${dedicatoria}"\n`;
            totalFinal += item.precio;
        });

        const totalConEnvio = totalFinal + costoMotorizado;

        mensaje += `\n*Subtotal de productos: S/ ${totalFinal.toFixed(2)}*`;
        mensaje += `\n*Motorizado estimado (segun distancia): S/ ${costoMotorizado.toFixed(2)}*`;
        mensaje += `\n*Total estimado: S/ ${totalConEnvio.toFixed(2)}*`;
        mensaje += '\n\n*Nota:* En casos especiales se puede evaluar entrega el mismo dia con recargo adicional coordinado por WhatsApp.';

        const numeroWhatsApp = '51930906901';
        const textoCodificado = encodeURIComponent(mensaje);
        const urlAPI = `https://wa.me/${numeroWhatsApp}?text=${textoCodificado}`;
        
        // Limpiar el carrito de la web porque el pedido ya se generó
        localStorage.removeItem('carritoDM');
        carrito = [];
        renderizarCarrito();
        actualizarContadorCarrito();

        // Redirigir al chat de WhatsApp
        window.location.href = urlAPI;
    });
});