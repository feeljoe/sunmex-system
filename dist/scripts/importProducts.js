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
var dotenv = require("dotenv");
dotenv.config();
var xlsx = require("xlsx");
var Product_1 = require("../models/Product");
var Brand_1 = require("../models/Brand");
var db_1 = require("../lib/db");
var ProductInventory_1 = require("../models/ProductInventory");
var path_1 = require("path");
var Type_1 = require("../models/Type");
function importProducts() {
    return __awaiter(this, void 0, void 0, function () {
        var projectRoot, excelPath, workbook, sheet, rows, created, _i, rows_1, row, brand, type, product;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, db_1.connectToDatabase)()];
                case 1:
                    _b.sent();
                    projectRoot = (0, path_1.join)(__dirname, "../../");
                    excelPath = (0, path_1.join)(projectRoot, "src/scripts/Productos.xlsx");
                    workbook = xlsx.readFile(excelPath);
                    sheet = workbook.Sheets[workbook.SheetNames[0]];
                    rows = xlsx.utils.sheet_to_json(sheet);
                    created = 0;
                    _i = 0, rows_1 = rows;
                    _b.label = 2;
                case 2:
                    if (!(_i < rows_1.length)) return [3 /*break*/, 8];
                    row = rows_1[_i];
                    return [4 /*yield*/, Brand_1.default.findOne({ name: row.brand })];
                case 3:
                    brand = _b.sent();
                    return [4 /*yield*/, Type_1.default.findOne({ name: row.type })];
                case 4:
                    type = _b.sent();
                    if (!brand) {
                        console.warn("Brand not found: ".concat(row.brand));
                        return [3 /*break*/, 7];
                    }
                    if (!type) {
                        console.warn("Type not found: ".concat(row.type));
                        return [3 /*break*/, 7];
                    }
                    return [4 /*yield*/, Product_1.default.findOneAndUpdate({ sku: row.sku }, {
                            sku: row.sku,
                            upc: row.upc,
                            name: row.name,
                            brand: brand._id,
                            image: "",
                            vendorSku: row.vendorSku,
                            unitCost: Number(row.unitCost),
                            unitPrice: Number(row.unitPrice),
                            type: type._id,
                        }, {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                        })];
                case 5:
                    product = _b.sent();
                    return [4 /*yield*/, ProductInventory_1.default.updateOne({ product: product._id }, {
                            $setOnInsert: {
                                product: product._id,
                                currentInventory: Number((_a = row.currentInventory) !== null && _a !== void 0 ? _a : 0),
                                preSavedInventory: 0,
                                onRouteInventory: 0,
                            },
                        }, { upsert: true })];
                case 6:
                    _b.sent();
                    created++;
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8:
                    console.log("Product Import completed");
                    console.log("Products altered: ".concat(created));
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
importProducts().catch(function (err) {
    console.error("Import failed.", err);
    process.exit(1);
});
