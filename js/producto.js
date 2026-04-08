/*(Específico para calcular el precio final si añaden chocolates/tarjetas)*/

/* ==========================================================================
   producto.js - Lógica de personalización dinámica
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Simulación de Base de Datos de Productos
    const productosDB = [
        { id: 1, nombre: "Cajita Romántica Mini", precio: 45.00, desc: "Hermoso detalle mini en colores pasteles, ideal para una sorpresa dulce.", imgText: "Ref: Arreglo Básico" },
        { id: 2, nombre: "Caja Clásica con Rosas", precio: 85.00, desc: "Hermoso arreglo de flores eternas hechas a mano, perfecto para demostrar tu cariño. Incluye caja cilíndrica de alta calidad.", imgText: "Ref: Arreglo Mediano" },
        { id: 3, nombre: "Ramo de Flores Eternas", precio: 95.00, desc: "Un ramo romántico que nunca se marchitará. Envuelto en papel especial con lazo de seda y un toque artesanal.", imgText: "Ref: Ramo Eterno" },
        { id: 4, nombre: "Corazón Premium + Chocolates", precio: 150.00, desc: "El regalo definitivo. Un arreglo en forma de corazón acompañado de deliciosos chocolates integrados.", imgText: "Ref: Arreglo Grande" },
        { id: 5, nombre: "Rosa en Cúpula (Estilo Bella y la Bestia)", precio: 120.00, desc: "Mágica rosa eterna encapsulada en una cúpula de cristal con luces LED (pilas incluidas).", imgText: "Ref: Cúpula Cristal" }
    ];

    // 2. Obtener el ID del producto que viene en la URL
    const parametrosURL = new URLSearchParams(window.location.search);
    const productoId = parseInt(parametrosURL.get('id')) || 2; // Si entran directo sin ID, muestra el producto 2 por defecto.

    // 3. Buscar la información del producto seleccionado
    const productoSeleccionado = productosDB.find(p => p.id === productoId);

    // 4. Conectar con los elementos del HTML
    const elNombre = document.getElementById('prod-nombre');
    const elDesc = document.getElementById('prod-desc');
    const elImgText = document.getElementById('prod-img-text');
    const precioFinalElement = document.getElementById('precio-final');

    // Reemplazar los textos en la pantalla
    elNombre.textContent = productoSeleccionado.nombre;
    elDesc.textContent = productoSeleccionado.desc;
    elImgText.textContent = productoSeleccionado.imgText;
    
    // Variables de precios
    let precioBase = productoSeleccionado.precio; 
    const costoChocolates = 15.00;
    
    // Mostrar el precio inicial correcto en pantalla
    precioFinalElement.textContent = `S/ ${precioBase.toFixed(2)}`;

    // ==========================================
    // LÓGICA DE INTERACCIÓN Y CARRITO
    // ==========================================
    const checkboxChocolates = document.getElementById('add-chocolates');
    const btnAgregar = document.getElementById('btn-agregar-carrito');

    // Actualizar el precio en vivo si añaden chocolates
    checkboxChocolates.addEventListener('change', () => {
        let precioActual = precioBase;
        if (checkboxChocolates.checked) {
            precioActual += costoChocolates;
        }
        precioFinalElement.textContent = `S/ ${precioActual.toFixed(2)}`;
    });

    // Guardar el producto dinámico en el carrito
    btnAgregar.addEventListener('click', () => {
        const colorCaja = document.getElementById('color-caja').value;
        const dedicatoria = document.getElementById('dedicatoria').value;
        const tieneChocolates = checkboxChocolates.checked;

        let precioCalculado = precioBase;
        if (tieneChocolates) precioCalculado += costoChocolates;

        const nuevoItem = {
            id: Date.now(), 
            nombre: productoSeleccionado.nombre, // ¡Añadimos el nombre dinámico!
            precio: precioCalculado,             // ¡Añadimos el precio dinámico!
            colorCaja: colorCaja,
            chocolates: tieneChocolates,
            dedicatoria: dedicatoria || 'Sin dedicatoria',
            cantidad: 1
        };

        carrito.push(nuevoItem);
        localStorage.setItem('carritoDM', JSON.stringify(carrito));

        actualizarContadorCarrito();
        alert(`¡${productoSeleccionado.nombre} añadido al carrito exitosamente!`);
    });
});