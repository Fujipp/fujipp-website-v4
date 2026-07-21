export interface ComponentV2TextField {
    key: string;
    label: string;
    description: string;
    fallback: string;
    rows?: number;
}

export interface ComponentV2Option {
    value: string;
    label?: string;
    description?: string;
    emoji?: string;
}

export interface ComponentAppearance {
    label?: string;
    emoji?: string;
    style?: string;
    placeholder?: string;
    url?: string;
    options?: ComponentV2Option[];
}

export interface ComponentsV2Config {
    texts?: Record<string, string>;
}

export const WALLET_COMPONENT_V2_FIELDS: Record<string, ComponentV2TextField[]> = {
    topup_panel: [
        { key: "heading", label: "หัวข้อ", description: "หัวข้อของแผงเติมเงิน", fallback: "# 💰 เติมเงินเข้ากระเป๋า" },
        { key: "description", label: "รายละเอียด", description: "คำอธิบายก่อนปุ่มเติมเงิน", fallback: "กดปุ่ม **เติมเงิน** ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ", rows: 4 },
    ],
    topup_method: [
        { key: "heading", label: "หัวข้อ", description: "หัวข้อเลือกช่องทาง", fallback: "# เลือกช่องทางเติมเงิน" },
        { key: "notice_heading", label: "หัวข้อคำแนะนำ", description: "ข้อความนำก่อนคำแนะนำ", fallback: "**🔻 อ่านก่อนเติม**" },
        { key: "notice", label: "คำแนะนำ", description: "รองรับ {{fee_text}}", fallback: "เติมเงินผ่านซองอั่งเปาทรูมันนี่ {{fee_text}}", rows: 4 },
    ],
    topup_invalid: [
        { key: "heading", label: "หัวข้อ", description: "หัวข้อแจ้งเตือนยอดไม่ถูกต้อง", fallback: "# ⚠️ แจ้งเตือน" },
        { key: "detail", label: "รายละเอียด", description: "รองรับ {{reason}} และ {{minimum}}", fallback: "{{reason}}", rows: 3 },
    ],
    topup_qr: [
        { key: "heading", label: "หัวข้อ", description: "หัวข้อหน้าชำระเงิน", fallback: "# 🏦 เติมเงินผ่านพร้อมเพย์" },
        { key: "amount", label: "ยอดชำระ", description: "รองรับ {{amount}}", fallback: "จำนวนเงินที่ต้องชำระ {{amount}}" },
        { key: "account", label: "ชื่อบัญชี", description: "รองรับ {{account_name}}", fallback: "-# **👤 ชื่อบัญชี** {{account_name}}" },
        { key: "countdown", label: "เวลาคงเหลือ", description: "รองรับ {{countdown}}", fallback: "-# **⏰ เหลือเวลาอีก** {{countdown}}" },
    ],
    topup_timeout: [
        { key: "heading", label: "หัวข้อ", description: "ข้อความเมื่อหมดเวลา", fallback: "# 🔴 เกินเวลาที่กำหนด" },
        { key: "detail_heading", label: "หัวข้อรายละเอียด", description: "หัวข้อย่อย", fallback: "**📋 รายละเอียด**" },
        { key: "detail", label: "รายละเอียด", description: "คำแนะนำหลังหมดเวลา", fallback: "หากทำรายการไม่ทันให้กดทำรายการใหม่อีกครั้ง แล้วแนบสลิปได้เลยหากส่งสลิปไม่ทัน ขออภัยหากคุณได้ทำรายการไปแล้ว", rows: 5 },
    ],
    processing: [
        { key: "heading", label: "หัวข้อ", description: "ข้อความระหว่างตรวจสอบ", fallback: "# ⌛️ กำลังประมวลผล" },
        { key: "detail_heading", label: "หัวข้อรายละเอียด", description: "หัวข้อย่อย", fallback: "**📋 รายละเอียด**" },
        { key: "detail", label: "รายละเอียด", description: "ข้อความสถานะ", fallback: "กำลังตรวจสอบสลิป กรุณารอสักครู่", rows: 3 },
    ],
    error: [
        { key: "heading", label: "หัวข้อ", description: "ข้อความข้อผิดพลาด", fallback: "# 🔴 เกิดข้อผิดพลาด" },
        { key: "detail_heading", label: "หัวข้อรายละเอียด", description: "หัวข้อย่อย", fallback: "**📋 รายละเอียด**" },
        { key: "detail", label: "รายละเอียด", description: "รองรับ {{reason}}", fallback: "{{reason}}", rows: 3 },
    ],
    topup_failed: [
        { key: "heading", label: "หัวข้อ", description: "ข้อความเมื่อเติมไม่สำเร็จ", fallback: "# 🔴 เติมเงินไม่สำเร็จ" },
        { key: "detail_heading", label: "หัวข้อรายละเอียด", description: "หัวข้อย่อย", fallback: "**📋 รายละเอียด**" },
        { key: "detail", label: "รายละเอียด", description: "รองรับ {{reason}}", fallback: "{{reason}}", rows: 3 },
    ],
    topup_success: [
        { key: "heading", label: "หัวข้อ", description: "ข้อความเมื่อเติมสำเร็จ", fallback: "# 🟢 เติมเงินสำเร็จ" },
        { key: "detail", label: "รายละเอียด", description: "รองรับ {{member}}, {{amount}}, {{total_balance}}, {{method}}, {{datetime}}", fallback: "**👤 คนทำรายการ**\n<@{{member}}>\n\n**💰 จำนวนเงินที่เติม**\n{{amount}}\n\n**🏧 ยอดทั้งหมดที่มี**\n{{total_balance}}\n\n**🏦 ช่องทางการเติม**\n{{method}}\n\n**🕑 วันที่และเวลาทำรายการ**\n{{datetime}}", rows: 10 },
    ],
};

export const VARIABLE_SUGGESTIONS: Record<string, string> = {
    amount: "จำนวนเงินของรายการ",
    account_name: "ชื่อบัญชีพร้อมเพย์",
    countdown: "เวลาที่เหลือแบบนับถอยหลัง",
    fee_text: "ข้อความค่าธรรมเนียม TrueMoney",
    member: "Discord user ID ของผู้ทำรายการ",
    total_balance: "ยอดคงเหลือหลังทำรายการ",
    method: "ช่องทางการเติมเงิน",
    datetime: "วันและเวลาของรายการ",
    reason: "สาเหตุข้อผิดพลาดจากระบบ",
    minimum: "ยอดเติมขั้นต่ำของร้าน",
};
