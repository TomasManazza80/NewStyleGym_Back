var dotenv = require('dotenv');
dotenv.config();

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var productRouter = require("./routes/product");
var paymentRouter = require("./routes/paymentRoutes");
var vexor = require("vexor");
const productBought = require("./routes/productBoughtRoute");
const activityPricesRoutes = require('./routes/activityPrices');
const { Vexor } = vexor;
const API_URL = process.env.VITE_API_URL;  

var app = express();  
const PORT = 3000;

const vexorInstance = new Vexor({
  publishableKey: process.env.VEXOR_PUBLISHABLE_KEY,
  projectId: process.env.VEXOR_PROJECT_ID,
  apiKey: process.env.VEXOR_API_KEY,
});



// View engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middlewares - Order is important!
app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use('/api/activity-prices', activityPricesRoutes);
app.use(`${API_URL}/`, indexRouter);
app.use('/', usersRouter);
app.use(`${API_URL}/product`, productRouter);
app.use('/payment', paymentRouter);
app.use('/products', productRouter);
app.use(`${API_URL}/boughtProduct`, productBought);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
