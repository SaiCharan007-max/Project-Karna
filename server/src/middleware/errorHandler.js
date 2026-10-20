// Registered last in app.js, so it receives every error passed to next().
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || err.status || 500;

    if (statusCode >= 500) {
        console.error(err);
    }

    res.status(statusCode).json({
        success: false,
        message: err.isOperational || err.expose ? err.message : "Internal server error",
    });
};

export default errorHandler;
