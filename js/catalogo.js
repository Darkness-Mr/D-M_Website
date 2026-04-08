/*(Específico para hacer funcionar el filtro por precios)*/

/* ==========================================================================
   catalogo.js - Lógica de los filtros de precio
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const radiosFiltro = document.querySelectorAll('input[name="precio"]');
    const productos = document.querySelectorAll('.item-producto');

    radiosFiltro.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const valorFiltro = e.target.value;

            productos.forEach(producto => {
                // Leemos el precio que pusimos en el HTML (ej: data-precio="85")
                const precio = parseFloat(producto.dataset.precio);
                let mostrar = false;

                // Lógica de filtrado
                if (valorFiltro === 'todos') {
                    mostrar = true;
                } else if (valorFiltro === 'economico' && precio < 50) {
                    mostrar = true;
                } else if (valorFiltro === 'medio' && precio >= 50 && precio <= 100) {
                    mostrar = true;
                } else if (valorFiltro === 'premium' && precio > 100) {
                    mostrar = true;
                }

                // Ocultar o mostrar usando la clase CSS
                if (mostrar) {
                    producto.classList.remove('oculto');
                } else {
                    producto.classList.add('oculto');
                }
            });
        });
    });
});