/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    // Le dice a Jest que use el preset de ts-jest
    preset: 'ts-jest',

    // El entorno donde se ejecutarán las pruebas (Node.js en nuestro caso)
    testEnvironment: 'node',

    // Un patrón para que Jest sepa dónde encontrar los archivos de prueba
    testMatch: ['**/tests/**/*.test.ts'],

    // Ignorar la carpeta de compilación en las pruebas
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
};