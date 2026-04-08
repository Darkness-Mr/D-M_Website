/*(Específico para calcular el precio final si añaden chocolates/tarjetas)*/

/* ==========================================================================
   producto.js - Lógica de personalización y agregar al carrito
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Variables de este producto en específico (en una web real vendrían de la base de datos)
    const precioBase = 85.00; 
    const costoChocolates = 15.00;

    // Elementos del DOM
    const checkboxChocolates = document.getElementById('add-chocolates');
    const precioFinalElement = document.getElementById('precio-final');
    const btnAgregar = document.getElementById('btn-agregar-carrito');

    // 1. Actualizar el precio en vivo si añaden chocolates
    checkboxChocolates.addEventListener('change', () => {
        let precioActual = precioBase;
        if (checkboxChocolates.checked) {
            precioActual += costoChocolates;
        }
        precioFinalElement.textContent = `S/ ${precioActual.toFixed(2)}`;
    });

    // 2. Lógica para guardar el producto en el carrito
    btnAgregar.addEventListener('click', () => {
        // Recolectar las opciones elegidas por el cliente
        const colorCaja = document.getElementById('color-caja').value;
        const dedicatoria = document.getElementById('dedicatoria').value;
        const tieneChocolates = checkboxChocolates.checked;

        let precioCalculado = precioBase;
        if (tieneChocolates) precioCalculado += costoChocolates;

        // Crear el objeto del producto
        const nuevoItem = {
            id: Date.now(), // Creamos un ID único temporal
            nombre: 'Caja Romántica Clásica',
            precio: precioCalculado,
            colorCaja: colorCaja,
            chocolates: tieneChocolates,
            dedicatoria: dedicatoria || 'Sin dedicatoria',
            cantidad: 1
        };

        // Guardar en el array global y actualizar localStorage
        carrito.push(nuevoItem);
        localStorage.setItem('carritoDM', JSON.stringify(carrito));

        // Actualizar el contador visual llamando a la función de main.js
        actualizarContadorCarrito();

        // Feedback al usuario
        alert('¡Arreglo añadido al carrito exitosamente!');
    });
});