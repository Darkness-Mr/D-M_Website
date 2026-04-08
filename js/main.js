/*(General: botón de WhatsApp global, menú de navegación, lógica del carrito en localStorage)*/

/* ==========================================================================
   main.js - Lógica Global (Se ejecuta en todas las páginas)
   ========================================================================== */

// 1. Inicializamos el carrito buscando en localStorage. Si no hay nada, creamos un array vacío.
let carrito = JSON.parse(localStorage.getItem('carritoDM')) || [];

// 2. Función para actualizar el número del icono del carrito en el menú superior
function actualizarContadorCarrito() {
    const contador = document.getElementById('cart-counter');
    if (contador) {
        // Sumamos la cantidad de todos los items en el carrito
        const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);
        contador.textContent = totalItems;
    }
}

// 3. Ejecutar la función apenas cargue cualquier página
document.addEventListener('DOMContentLoaded', () => {
    actualizarContadorCarrito();
});