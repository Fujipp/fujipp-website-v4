// Feature config model — the frontend mirror of billing.feature_variable_templates.
// The config form is rendered dynamically from these definitions, so adding a
// feature in the backbone (a new catalog row + templates) needs no new UI.

export type ConfigValueType =
    | "STRING"
    | "TEXT"
    | "NUMBER"
    | "BOOLEAN"
    | "CHANNEL_ID"
    | "ROLE_ID"
    | "USER_ID"
    | "SECRET"
    | "JSON";

export interface FeatureConfigField {
    variableKey: string;
    label: string;
    description?: string;
    valueType: ConfigValueType;
    isRequired: boolean;
    isSensitive: boolean;
    defaultValue?: string;
    sortOrder: number;
}

export interface FeatureDefinition {
    code: string;
    name: string;
    fields: FeatureConfigField[];
}

/** Shape of GET /api/bots/:botId/config (to be implemented by the backend). */
export interface BotConfigResponse {
    features: FeatureDefinition[];
    values: Record<string, string>;
    channels?: { id: string; name: string }[];
    roles?: { id: string; name: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE definitions — mirror the seeded templates (migrations 20260605170000).
// Used as a fallback so the form is demonstrable before the backend endpoint
// exists. Once the API is live, the real response replaces these.
// ─────────────────────────────────────────────────────────────────────────────
export const SAMPLE_FEATURES: FeatureDefinition[] = [
    {
        code: "roblox-robux-payout",
        name: "Roblox Robux Payout",
        fields: [
            { variableKey: "ROBLOX_GROUP_ID", label: "Roblox Group ID", description: "ไอดีกลุ่ม Roblox ที่ใช้จ่าย Robux", valueType: "NUMBER", isRequired: true, isSensitive: false, sortOrder: 10 },
            { variableKey: "ROBLOX_SECURITY_COOKIE", label: ".ROBLOSECURITY Cookie", description: "คุกกี้ล็อกอินบัญชีเจ้าของกลุ่ม — ความลับสูงสุด ห้ามเปิดเผย", valueType: "SECRET", isRequired: true, isSensitive: true, sortOrder: 20 },
            { variableKey: "ROBLOX_TOTP_SECRET", label: "2FA TOTP Secret", description: "Secret ของ Authenticator ใช้ยืนยัน 2FA ตอนจ่าย Robux", valueType: "SECRET", isRequired: true, isSensitive: true, sortOrder: 30 },
            { variableKey: "ROBLOX_GROUP_NAME", label: "ชื่อกลุ่ม (แสดงผล)", description: "ชื่อกลุ่มที่ใช้โชว์ใน embed", valueType: "STRING", isRequired: false, isSensitive: false, sortOrder: 40 },
            { variableKey: "ROBUX_RATE", label: "เรทแลก Robux (บาท/Robux)", description: "ราคาบาทต่อ 1 Robux เช่น 0.25 — ปรับตามร้าน", valueType: "NUMBER", isRequired: true, isSensitive: false, sortOrder: 50 },
            { variableKey: "ROBUX_ENABLED", label: "เปิดระบบจ่าย Robux", description: "ปิดชั่วคราวได้โดยไม่ต้องลบ config", valueType: "BOOLEAN", isRequired: false, isSensitive: false, defaultValue: "true", sortOrder: 60 },
            { variableKey: "ROBUX_PAYOUT_COOLDOWN", label: "คูลดาวน์การจ่าย (วินาที)", description: "หน่วงเวลาขั้นต่ำระหว่างการจ่ายแต่ละครั้ง", valueType: "NUMBER", isRequired: false, isSensitive: false, defaultValue: "0", sortOrder: 70 },
            { variableKey: "ROBUX_NOTIFY_CHANNEL", label: "ช่องแจ้งเตือนการจ่าย Robux", description: "ห้องที่บอทจะโพสต์สรุปเมื่อจ่าย Robux สำเร็จ", valueType: "CHANNEL_ID", isRequired: false, isSensitive: false, sortOrder: 80 },
            { variableKey: "PAYMENT_COUNTDOWN_ENABLED", label: "เปิดนับถอยหลังโปรโมชัน", description: "แสดงตัวนับถอยหลังบน embed ราคา", valueType: "BOOLEAN", isRequired: false, isSensitive: false, defaultValue: "false", sortOrder: 90 },
            { variableKey: "PAYMENT_COUNTDOWN_TARGET", label: "เวลาเป้าหมายนับถอยหลัง", description: "รูปแบบ ISO 8601 เช่น 2026-12-31T00:00:00+07:00", valueType: "STRING", isRequired: false, isSensitive: false, sortOrder: 100 },
            { variableKey: "ROBLOX_GROUPS", label: "หลายกลุ่ม (ขั้นสูง — JSON)", description: "ตั้งหลายกลุ่มพร้อม cookie/totp ต่อกลุ่ม; ถ้าตั้งจะทับค่าเดี่ยวด้านบน", valueType: "JSON", isRequired: false, isSensitive: true, sortOrder: 110 },
        ],
    },
    {
        code: "wallet-topup",
        name: "Shop Wallet & Top-up",
        fields: [
            { variableKey: "API_SLIPOK_KEY", label: "SlipOK API Key", description: "คีย์ API ของ SlipOK สำหรับตรวจสลิป", valueType: "SECRET", isRequired: true, isSensitive: true, sortOrder: 10 },
            { variableKey: "SLIPOK_BRANCH_ID", label: "SlipOK Branch ID", description: "รหัสสาขาใน SlipOK", valueType: "STRING", isRequired: true, isSensitive: false, sortOrder: 20 },
            { variableKey: "PROMPTPAY_NUMBER", label: "เบอร์/พร้อมเพย์รับเงิน", description: "เบอร์โทรหรือเลขบัตรประชาชนที่ผูกพร้อมเพย์", valueType: "STRING", isRequired: true, isSensitive: false, sortOrder: 30 },
            { variableKey: "MIN_TOPUP", label: "เติมขั้นต่ำ (บาท)", description: "ยอดเติมต่ำสุดที่ร้านยอมรับ", valueType: "NUMBER", isRequired: false, isSensitive: false, defaultValue: "20", sortOrder: 40 },
            { variableKey: "API_TRUEMONEY_KEY_ID", label: "TrueMoney Key ID", description: "คีย์สำหรับตรวจซองอั่งเปา TrueMoney (ถ้าใช้)", valueType: "SECRET", isRequired: false, isSensitive: true, sortOrder: 50 },
            { variableKey: "TRUEMONEY_PHONE", label: "เบอร์ TrueMoney Wallet รับเงิน", description: "เบอร์ปลายทางที่รับซอง TrueMoney", valueType: "STRING", isRequired: false, isSensitive: false, sortOrder: 60 },
            { variableKey: "TRUEMONEY_BASE", label: "TrueMoney API Base URL", description: "override endpoint (เว้นว่างใช้ค่าเริ่มต้น)", valueType: "STRING", isRequired: false, isSensitive: false, sortOrder: 70 },
            { variableKey: "TRUEMONEY_FEE", label: "ค่าธรรมเนียม TrueMoney (%)", description: "หักเปอร์เซ็นต์จากยอดเติมผ่าน TrueMoney", valueType: "NUMBER", isRequired: false, isSensitive: false, defaultValue: "0", sortOrder: 80 },
        ],
    },
];
