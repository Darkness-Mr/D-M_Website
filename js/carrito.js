/*(Específico para el flujo de pago, calcular envío a Ate y validar datos)*/

/* ==========================================================================
   carrito.js - Renderizado del carrito y envío por WhatsApp
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const contenedorItems = document.getElementById('carrito-items');
    const totalPrecioElement = document.getElementById('total-precio');
    const formCheckout = document.getElementById('checkout-form');

    // 1. Función para pintar los productos guardados en pantalla
    function renderizarCarrito() {
        contenedorItems.innerHTML = ''; // Limpiar contenedor
        let total = 0;

        if (carrito.length === 0) {
            contenedorItems.innerHTML = '<p>Tu carrito está vacío. ¡Anímate a ver nuestro catálogo!</p>';
            totalPrecioElement.textContent = 'S/ 0.00';
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

        totalPrecioElement.textContent = `S/ ${total.toFixed(2)}`;
    }

    // 2. Función global para poder eliminar un producto dando clic al tacho de basura
    window.eliminarItem = function(index) {
        carrito.splice(index, 1); // Quitar del array
        localStorage.setItem('carritoDM', JSON.stringify(carrito)); // Guardar cambios
        renderizarCarrito(); // Volver a pintar
        actualizarContadorCarrito(); // Actualizar bolita de arriba
    };

    // Llamar a la función para pintar el carrito al entrar a la página
    renderizarCarrito();

    // 3. Lógica final: Procesar el pago rápido y enviar WhatsApp
    formCheckout.addEventListener('submit', (e) => {
        e.preventDefault(); // Evitar que la página se recargue

        if (carrito.length === 0) {
            alert('Agrega al menos un arreglo a tu carrito antes de continuar.');
            return;
        }

        // Obtener los datos del formulario
        const inputs = formCheckout.querySelectorAll('input:not([type="radio"])');
        const nombre = inputs[0].value;
        const telefono = inputs[1].value;
        const direccion = inputs[2].value;
        const fecha = inputs[3].value; // Ya tiene validación de HTML5 para fecha
        const metodoPago = document.querySelector('input[name="pago"]:checked').value;

        // Construir el mensaje para WhatsApp
        let mensaje = '*Hola D&M Detalles! Vengo de la web y quiero confirmar un pedido:*\n\n';
        mensaje += `*DATOS DEL CLIENTE:*\n- Nombre: ${nombre}\n- Teléfono: ${telefono}\n- Dirección (Ate): ${direccion}\n- Fecha de Entrega: ${fecha}\n- Método de Pago: ${metodoPago.toUpperCase()}\n\n`;
        
        mensaje += '*DETALLE DEL PEDIDO:*\n';
        let totalFinal = 0;
        
        carrito.forEach(item => {
            const dedicatoria = item.dedicatoria ? item.dedicatoria : 'Sin dedicatoria';
            mensaje += `- ${item.nombre} (S/ ${item.precio.toFixed(2)})\n`;
            mensaje += `  Caja: ${item.colorCaja} ${item.chocolates ? '| + Chocolates' : ''}\n`;
            mensaje += `  Mensaje tarjeta: "${dedicatoria}"\n`;
            totalFinal += item.precio;
        });

        mensaje += `\n*Total de productos (sin contar costo de envío): S/ ${totalFinal.toFixed(2)}*`;

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