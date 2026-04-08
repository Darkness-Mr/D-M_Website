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
    const direccionInput = document.getElementById('direccion-cliente');
    const fechaEntregaInput = document.getElementById('fecha-entrega');

    let subtotalProductos = 0;
    let costoMotorizado = 0;

    function normalizarTexto(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

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

    function calcularCostoMotorizado(direccion) {
        const texto = normalizarTexto(direccion || '');

        if (!texto) return 0;

        const zonasCercanas = ['santa clara', 'vitarte', 'ceres', 'huaycan', 'puruchuco'];
        const zonasIntermedias = ['salamanca', 'mayorazgo', 'olimpo', 'valdiviezo', 'josfel', 'pariachi', 'horacio zeballos'];

        if (zonasCercanas.some(zona => texto.includes(zona))) {
            return 6;
        }

        if (zonasIntermedias.some(zona => texto.includes(zona))) {
            return 10;
        }

        return 14;
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

    if (direccionInput) {
        direccionInput.addEventListener('input', () => {
            costoMotorizado = calcularCostoMotorizado(direccionInput.value);
            actualizarTotales();
        });
    }

    if (fechaEntregaInput) {
        fechaEntregaInput.addEventListener('change', validarFechaEntrega);
    }

    configurarCalendarioEntrega();

    // Llamar a la función para pintar el carrito al entrar a la página
    renderizarCarrito();
    actualizarTotales();

    // 3. Lógica final: Procesar el pago rápido y enviar WhatsApp
    formCheckout.addEventListener('submit', (e) => {
        e.preventDefault(); // Evitar que la página se recargue

        if (carrito.length === 0) {
            alert('Agrega al menos un arreglo a tu carrito antes de continuar.');
            return;
        }

        // Obtener los datos del formulario
        const nombre = document.getElementById('nombre-cliente').value.trim();
        const telefono = document.getElementById('telefono-cliente').value.trim();
        const direccion = document.getElementById('direccion-cliente').value.trim();
        const fecha = fechaEntregaInput.value;
        const metodoPago = document.querySelector('input[name="pago"]:checked').value;

        if (!esFechaEntregaValida(fecha)) {
            alert('La fecha de entrega debe ser como minimo 2 dias despues del pedido.');
            return;
        }

        costoMotorizado = calcularCostoMotorizado(direccion);
        actualizarTotales();

        // Construir el mensaje para WhatsApp
        let mensaje = '*Hola D&M Detalles! Vengo de la web y quiero confirmar un pedido:*\n\n';
        mensaje += `*DATOS DEL CLIENTE:*\n- Nombre: ${nombre}\n- Teléfono: ${telefono}\n- Dirección (Ate): ${direccion}\n- Fecha de Entrega solicitada: ${fecha}\n- Método de Pago: ${metodoPago.toUpperCase()}\n\n`;
        
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
        mensaje += `\n*Motorizado estimado (desde Santa Clara): S/ ${costoMotorizado.toFixed(2)}*`;
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