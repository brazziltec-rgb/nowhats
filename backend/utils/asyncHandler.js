/**
 * Wrapper para funções assíncronas que captura erros automaticamente
 * @param {Function} fn - Função assíncrona a ser executada
 * @returns {Function} - Middleware do Express
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default asyncHandler;