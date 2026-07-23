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
    layout?: ComponentV2Block[];
    container?: {
        accentColor?: number;
        spoiler?: boolean;
    };
}

export interface ComponentV2LinkButton {
    id: string;
    label: string;
    emoji?: string;
    url: string;
}

export type ComponentV2Block =
    | { id: string; type: "text"; content: string }
    | { id: string; type: "section"; content: string; accessoryUrl: string }
    | { id: string; type: "separator"; divider: boolean; spacing: 1 | 2 }
    | { id: string; type: "media"; url: string; description?: string; spoiler?: boolean }
    | { id: string; type: "row"; rowKey?: string; buttons?: ComponentV2LinkButton[] };

type ComponentV2BlockTemplate =
    | { type: "text"; field: string }
    | { type: "section"; field: string; accessoryUrl: string }
    | { type: "separator"; divider: boolean; spacing: 1 | 2 }
    | { type: "media"; url: string; description?: string }
    | { type: "row"; rowKey: string };

export const WALLET_COMPONENT_V2_LAYOUTS: Record<string, ComponentV2BlockTemplate[]> = {
    topup_panel: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "separator", divider: false, spacing: 1 },
        { type: "text", field: "description" }, { type: "separator", divider: true, spacing: 2 },
        { type: "row", rowKey: "topup_panel_actions" },
    ],
    balance: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "section", field: "balance_text", accessoryUrl: "{{avatar_url}}" },
        { type: "separator", divider: false, spacing: 1 },
        { type: "separator", divider: true, spacing: 2 },
        { type: "media", url: "", description: "Wallet artwork" },
    ],
    topup_method: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "notice_heading" }, { type: "separator", divider: false, spacing: 1 },
        { type: "text", field: "notice" }, { type: "separator", divider: true, spacing: 2 },
        { type: "row", rowKey: "topup_method_actions" },
    ],
    topup_invalid: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "detail" }, { type: "separator", divider: true, spacing: 2 },
        { type: "row", rowKey: "close_action" },
    ],
    topup_qr: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "amount" }, { type: "separator", divider: false, spacing: 1 },
        { type: "text", field: "account" }, { type: "text", field: "countdown" },
        { type: "separator", divider: true, spacing: 2 },
        { type: "media", url: "{{qr_image}}", description: "QR พร้อมเพย์" },
        { type: "separator", divider: true, spacing: 2 },
        { type: "row", rowKey: "slip_action" },
    ],
    topup_timeout: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "detail_heading" }, { type: "separator", divider: false, spacing: 1 },
        { type: "text", field: "detail" }, { type: "separator", divider: true, spacing: 2 },
        { type: "row", rowKey: "timeout_actions" },
    ],
    processing: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "detail_heading" }, { type: "separator", divider: false, spacing: 1 },
        { type: "text", field: "detail" },
    ],
    error: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "detail_heading" }, { type: "separator", divider: false, spacing: 1 },
        { type: "text", field: "detail" },
    ],
    topup_failed: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "detail_heading" }, { type: "separator", divider: false, spacing: 1 },
        { type: "text", field: "detail" },
    ],
    topup_success: [
        { type: "text", field: "heading" }, { type: "separator", divider: true, spacing: 2 },
        { type: "text", field: "detail" },
    ],
};

export function createWalletComponentLayout(slotKey: string, config?: ComponentsV2Config): ComponentV2Block[] {
    if (Array.isArray(config?.layout)) return JSON.parse(JSON.stringify(config.layout)) as ComponentV2Block[];
    const fields = Object.fromEntries((WALLET_COMPONENT_V2_FIELDS[slotKey] ?? []).map((field) => [field.key, field]));
    return (WALLET_COMPONENT_V2_LAYOUTS[slotKey] ?? []).map((block, index) => {
        const id = `${slotKey}-${block.type}-${index + 1}`;
        if (block.type === "text") {
            const field = fields[block.field];
            return { id, type: "text", content: config?.texts?.[block.field] || field?.fallback || "" };
        }
        if (block.type === "section") {
            const field = fields[block.field];
            return { id, type: "section", content: config?.texts?.[block.field] || field?.fallback || "", accessoryUrl: block.accessoryUrl };
        }
        if (block.type === "separator") return { id, ...block };
        if (block.type === "media") return { id, ...block };
        return { id, ...block };
    });
}

export const WALLET_COMPONENT_V2_FIELDS: Record<string, ComponentV2TextField[]> = {
    topup_panel: [
        { key: "heading", label: "หัวข้อ", description: "หัวข้อของแผงเติมเงิน", fallback: "# เติมเงินเข้ากระเป๋า" },
        { key: "description", label: "รายละเอียด", description: "คำอธิบายก่อนปุ่มเติมเงิน", fallback: "กดปุ่ม เติมเงิน ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ", rows: 4 },
    ],
    balance: [
        { key: "heading", label: "หัวข้อ", description: "หัวข้อของกระเป๋าเงิน", fallback: "# 💳 เงินในบัญชีของคุณ" },
        { key: "balance_text", label: "ยอดคงเหลือ", description: "รองรับ {{balance}}", fallback: "# ยอดคงเหลือ {{balance}}" },
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
    gross: "ยอดก่อนหักค่าธรรมเนียม",
    fee: "ค่าธรรมเนียมของรายการ",
    account_name: "ชื่อบัญชีพร้อมเพย์",
    countdown: "เวลาที่เหลือแบบนับถอยหลัง",
    qr_image: "รูป QR พร้อมเพย์ของรายการ",
    fee_text: "ข้อความค่าธรรมเนียม TrueMoney",
    member: "Discord user ID ของผู้ทำรายการ",
    total_balance: "ยอดคงเหลือหลังทำรายการ",
    method: "ช่องทางการเติมเงิน",
    datetime: "วันและเวลาของรายการ",
    reason: "สาเหตุข้อผิดพลาดจากระบบ",
    minimum: "ยอดเติมขั้นต่ำของร้าน",
    balance: "ยอดคงเหลือในกระเป๋าเงิน",
    avatar_url: "รูปโปรไฟล์ Discord ของสมาชิก",
    member_id: "Discord User ID ของสมาชิก",
    member_mention: "Mention สมาชิกแบบกดได้",
    member_username: "Username ของสมาชิก",
    member_display_name: "ชื่อที่แสดงของสมาชิก",
    member_avatar_url: "รูปโปรไฟล์ Discord ของสมาชิก",
    guild_id: "Discord Server ID",
    guild_name: "ชื่อ Discord Server",
    channel_id: "Discord Channel ID",
    channel_mention: "Mention ห้องแบบกดได้",
    bot_id: "Discord User ID ของบอท",
    bot_name: "ชื่อ Discord ของบอท",
    bot_avatar_url: "รูปโปรไฟล์ Discord ของบอท",
};
