"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importPreorders = importPreorders;
var dotenv = require("dotenv");
dotenv.config();
var xlsx = require("xlsx");
var path_1 = require("path");
var mongoose_1 = require("mongoose");
var db_1 = require("../lib/db");
var PreOrder_1 = require("../models/PreOrder");
var Client_1 = require("../models/Client");
var Product_1 = require("../models/Product");
var ProductInventory_1 = require("../models/ProductInventory");
var Route_1 = require("../models/Route");
var FALLBACK_USER_ID = new mongoose_1.default.Types.ObjectId("696465f161f2df04e4abaa75");
function parseExcelDate(value) {
    if (value instanceof Date)
        return value;
    if (typeof value === "number") {
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    return new Date(value);
}
function importPreorders() {
    return __awaiter(this, void 0, void 0, function () {
        var projectRoot, excelPath, workbook, sheet, rows, grouped, _i, rows_1, row, created, skipped, _a, _b, _c, preorderNumber, group, first, client, deliveryDate, createdBy, vendorRoute, routeAssigned, driverRoute, products, subtotal, _d, group_1, row, product, inventory, qty, cost;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, db_1.connectToDatabase)()];
                case 1:
                    _e.sent();
                    projectRoot = (0, path_1.join)(__dirname, "../../");
                    excelPath = (0, path_1.join)(projectRoot, "src/scripts/Preorders.xlsx");
                    workbook = xlsx.readFile(excelPath);
                    sheet = workbook.Sheets[workbook.SheetNames[0]];
                    rows = xlsx.utils.sheet_to_json(sheet);
                    grouped = new Map();
                    for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                        row = rows_1[_i];
                        if (!grouped.has(row.number))
                            grouped.set(row.number, []);
                        grouped.get(row.number).push(row);
                    }
                    created = 0;
                    skipped = 0;
                    _a = 0, _b = Array.from(grouped.entries());
                    _e.label = 2;
                case 2:
                    if (!(_a < _b.length)) return [3 /*break*/, 15];
                    _c = _b[_a], preorderNumber = _c[0], group = _c[1];
                    first = group[0];
                    return [4 /*yield*/, Client_1.default.findOne({ clientNumber: first.clientNumber })];
                case 3:
                    client = _e.sent();
                    if (!client) {
                        console.warn("\u274C Client not found: ".concat(first.clientNumber));
                        skipped++;
                        return [3 /*break*/, 14];
                    }
                    deliveryDate = parseExcelDate(first.deliveryDate);
                    if (isNaN(deliveryDate.getTime())) {
                        console.warn("\u274C Invalid delivery date for preorder ".concat(preorderNumber));
                        skipped++;
                        return [3 /*break*/, 14];
                    }
                    createdBy = FALLBACK_USER_ID;
                    if (!(first.routeVendor !== "001")) return [3 /*break*/, 5];
                    return [4 /*yield*/, Route_1.default.findOne({ code: first.routeVendor })];
                case 4:
                    vendorRoute = _e.sent();
                    if (vendorRoute === null || vendorRoute === void 0 ? void 0 : vendorRoute.user)
                        createdBy = vendorRoute.user;
                    _e.label = 5;
                case 5:
                    routeAssigned = void 0;
                    if (!(first.routeDriver !== "001")) return [3 /*break*/, 7];
                    return [4 /*yield*/, Route_1.default.findOne({ code: first.routeDriver })];
                case 6:
                    driverRoute = _e.sent();
                    if (driverRoute)
                        routeAssigned = driverRoute._id;
                    _e.label = 7;
                case 7:
                    products = [];
                    subtotal = 0;
                    _d = 0, group_1 = group;
                    _e.label = 8;
                case 8:
                    if (!(_d < group_1.length)) return [3 /*break*/, 12];
                    row = group_1[_d];
                    return [4 /*yield*/, Product_1.default.findOne({ sku: row.sku })];
                case 9:
                    product = _e.sent();
                    if (!product) {
                        console.warn("\u274C Product not found: ".concat(row.sku, " (Preorder ").concat(preorderNumber, ")"));
                        skipped++;
                        return [3 /*break*/, 11];
                    }
                    return [4 /*yield*/, ProductInventory_1.default.findOne({ product: product._id })];
                case 10:
                    inventory = _e.sent();
                    if (!inventory) {
                        console.warn("\u274C Inventory not found for SKU ".concat(row.sku));
                        skipped++;
                        return [3 /*break*/, 11];
                    }
                    qty = Number(row.quantity);
                    cost = Number(row.actualCost);
                    subtotal += qty * cost;
                    products.push({
                        productInventory: inventory._id,
                        quantity: qty,
                        pickedQuantity: qty,
                        deliveredQuantity: qty,
                        actualCost: cost,
                    });
                    _e.label = 11;
                case 11:
                    _d++;
                    return [3 /*break*/, 8];
                case 12: return [4 /*yield*/, PreOrder_1.default.create({
                        number: preorderNumber,
                        client: client._id,
                        products: products,
                        createdBy: createdBy,
                        routeAssigned: routeAssigned,
                        deliveryDate: deliveryDate,
                        createdAt: deliveryDate,
                        deliveredAt: deliveryDate,
                        status: "delivered",
                        subtotal: subtotal,
                        total: subtotal,
                        paymentStatus: "pending",
                    })];
                case 13:
                    _e.sent();
                    created++;
                    _e.label = 14;
                case 14:
                    _a++;
                    return [3 /*break*/, 2];
                case 15:
                    console.log("✅ Preorder import completed (NO INVENTORY)");
                    console.log("Created: ".concat(created));
                    console.log("Skipped: ".concat(skipped));
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
importPreorders().catch(function (err) {
    console.error("❌ Import failed", err);
    process.exit(1);
});
