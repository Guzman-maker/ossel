# Pinturas Osel Web App

Este es un proyecto completo de una tienda de pinturas "Osel" con sistema de lealtad, e-commerce básico y panel de administración.

## Requisitos Previos

- **Node.js**: Debes tener Node.js instalado.
- **MongoDB**: Debes tener una instancia de MongoDB corriendo localmente o una URI de conexión en un archivo `.env`.

## Instalación

1.  Abre una terminal en esta carpeta.
2.  Ejecuta el siguiente comando para instalar las librerías necesarias:
    ```bash
    npm install
    ```

## Configuración y Datos Iniciales

1.  Asegúrate de que MongoDB esté corriendo.
2.  Para cargar productos de ejemplo y el usuario administrador, ejecuta:
    ```bash
    npm run seed
    ```
    *(Esto creará 4 productos y un admin: admin@osel.com / admin123)*

## Ejecución

1.  Inicia el servidor:
    ```bash
    npm start
    ```
2.  Abre tu navegador en: [http://localhost:3000](http://localhost:3000)

## Características

- **Diseño Glassmorphism Moderno**: Animaciones GSAP y estilo limpio.
- **SPA (Single Page Application)**: Navegación sin recargas.
- **Carrito de Compras**: Agregar productos y calcular total.
- **Sistema de Puntos**: Gana 100 puntos por cada producto.
- **Calculadora**: Estima litros necesarios por m².
- **Login/Registro**: Usuarios y Admin.

## Credenciales Admin (Demo)

- **Email**: `admin@osel.com`
- **Password**: `admin123`
