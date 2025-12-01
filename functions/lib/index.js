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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserOnAuth = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Inicializa admin una sola vez
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Función que se ejecuta cuando se crea un usuario en Auth
exports.createUserOnAuth = functions
    .region('us-central1')
    .auth.user()
    .onCreate(async (user) => {
    const uid = user.uid;
    const docRef = db.collection('users').doc(uid);
    try {
        const doc = await docRef.get();
        if (doc.exists) {
            console.log(`users/${uid} already exists — updating fields`);
            await docRef.update({
                email: user.email || null,
                name: user.displayName || null,
                authUid: uid,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('audit_logs').add({
                action: 'onCreateAuthUser:update',
                uid,
                email: user.email || null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                message: 'Updated existing users doc on auth onCreate',
            });
        }
        else {
            await docRef.set({
                authUid: uid,
                email: user.email || null,
                name: user.displayName || null,
                status: 'pendiente',
                role: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('audit_logs').add({
                action: 'onCreateAuthUser:create',
                uid,
                email: user.email || null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                message: 'Created users doc with status pendiente',
            });
            console.log(`Created users/${uid} with status 'pendiente'`);
        }
    }
    catch (error) {
        console.error('Error in createUserOnAuth:', error);
        // Re-throw para que Firebase registre el fallo
        throw error;
    }
});
