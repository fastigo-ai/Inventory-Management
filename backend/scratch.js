"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var dotenv = __importStar(require("dotenv"));
var path_1 = __importDefault(require("path"));
// Load env
dotenv.config({ path: path_1.default.join(process.cwd(), 'frontend', '.env') });
var mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-system';
var diSchema = new mongoose_1.default.Schema({}, { strict: false });
var piSchema = new mongoose_1.default.Schema({}, { strict: false });
var DI = mongoose_1.default.model('DI', diSchema, 'dis');
var PI = mongoose_1.default.model('PurchaseInvoice', piSchema, 'purchaseinvoices');
function check() {
    return __awaiter(this, void 0, void 0, function () {
        var dis, di, _i, _a, li, pis, totalConsumed, _b, pis_1, pi, piAny, _c, _d, li;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, mongoose_1.default.connect(mongoUri)];
                case 1:
                    _f.sent();
                    return [4 /*yield*/, DI.find({ diNumber: 'CEO/MM/RDSS/Loss reduction/2024-25/-22990-99' }).lean()];
                case 2:
                    dis = _f.sent();
                    console.log("Found ".concat(dis.length, " DIs"));
                    if (!(dis.length > 0)) return [3 /*break*/, 4];
                    di = dis[0];
                    console.log("DI ID: ".concat(di._id));
                    console.log("DI Line Items:");
                    for (_i = 0, _a = di.lineItems || []; _i < _a.length; _i++) {
                        li = _a[_i];
                        console.log("  - Item: ".concat(li.itemName, ", Qty: ").concat(li.quantity, ", LineId: ").concat(li._id));
                    }
                    return [4 /*yield*/, PI.find({ 'lineItems.diId': di._id }).lean()];
                case 3:
                    pis = _f.sent();
                    console.log("\nFound ".concat(pis.length, " PIs consuming this DI"));
                    totalConsumed = 0;
                    for (_b = 0, pis_1 = pis; _b < pis_1.length; _b++) {
                        pi = pis_1[_b];
                        piAny = pi;
                        console.log("  - PI: ".concat(piAny.invoiceNumber, ", Status: ").concat(piAny.status));
                        for (_c = 0, _d = piAny.lineItems || []; _c < _d.length; _c++) {
                            li = _d[_c];
                            if (((_e = li.diId) === null || _e === void 0 ? void 0 : _e.toString()) === di._id.toString()) {
                                console.log("      Line Qty: ".concat(li.quantity));
                                totalConsumed += Number(li.quantity);
                            }
                        }
                    }
                    console.log("\nTotal Consumed: ".concat(totalConsumed));
                    _f.label = 4;
                case 4: return [4 /*yield*/, mongoose_1.default.disconnect()];
                case 5:
                    _f.sent();
                    return [2 /*return*/];
            }
        });
    });
}
check().catch(console.error);
