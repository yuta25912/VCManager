class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.catName = '🔊 VCManager';
    }

    async onload() {
        this.registerBlocks();
        console.log("VCManager Plugin loaded!");
    }

    async onunload() {
        this.unregisterBlocks();
        console.log("VCManager Plugin unloaded.");
    }

    registerBlocks() {
        if (typeof Blockly === 'undefined') return;

        // 1. VC全員移動
        Blockly.Blocks['vc_move_all'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🔊 チャンネル")
                    .appendField(new Blockly.FieldTextInput("元チャンネルID"), "FROM_ID")
                    .appendField("の全員を")
                    .appendField(new Blockly.FieldTextInput("先チャンネルID"), "TO_ID")
                    .appendField("へ移動");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(160);
                this.setTooltip("指定したチャンネルにいる全員を別のチャンネルへ一括移動させます。");
            }
        };

        // 2. 特定ユーザー移動
        Blockly.Blocks['vc_move_members'] = {
            init: function () {
                this.appendValueInput("MEMBERS")
                    .setCheck("Array")
                    .appendField("👤 リスト");
                this.appendDummyInput()
                    .appendField("をチャンネル")
                    .appendField(new Blockly.FieldTextInput("先チャンネルID"), "TO_ID")
                    .appendField("へ移動");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(160);
                this.setTooltip("指定したユーザーリスト全員を別のチャンネルへ移動させます。");
            }
        };

        // 3. 権限設定 (表示/接続/発言)
        Blockly.Blocks['vc_set_permission'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🔐 チャンネル")
                    .appendField(new Blockly.FieldTextInput("チャンネルID"), "CHANNEL_ID")
                    .appendField("の");
                this.appendDummyInput()
                    .appendField("対象")
                    .appendField(new Blockly.FieldTextInput("ロール/ユーザーID"), "TARGET_ID")
                    .appendField("の権限設定");
                this.appendDummyInput()
                    .appendField("👁️表示:")
                    .appendField(new Blockly.FieldDropdown([["変更なし", "NONE"], ["許可", "ALLOW"], ["拒否", "DENY"]]), "VIEW")
                    .appendField(" 🔌接続:")
                    .appendField(new Blockly.FieldDropdown([["変更なし", "NONE"], ["許可", "ALLOW"], ["拒否", "DENY"]]), "CONNECT")
                    .appendField(" 💬発言:")
                    .appendField(new Blockly.FieldDropdown([["変更なし", "NONE"], ["許可", "ALLOW"], ["拒否", "DENY"]]), "SPEAK");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(20);
                this.setTooltip("ボイスチャンネルの「表示・接続・発言」権限を個別に切り替えます。");
            }
        };

        // Python生成
        const order = (Blockly.Python && (Blockly.Python.ORDER_ATOMIC || 0)) || 0;

        const registerGenerator = (id, fn) => {
            if (Blockly.Python) {
                if (Blockly.Python.forBlock) {
                    Blockly.Python.forBlock[id] = fn;
                }
                Blockly.Python[id] = fn;
            }
        };

        // 全員移動ジェネレータ
        registerGenerator('vc_move_all', (block) => {
            const fromId = block.getFieldValue('FROM_ID');
            const toId = block.getFieldValue('TO_ID');
            return `
from_channel = self.bot.get_channel(int(${fromId}))
to_channel = self.bot.get_channel(int(${toId}))
if from_channel and to_channel:
    for member in from_channel.members:
        await member.move_to(to_channel)
`;
        });

        // リスト移動ジェネレータ
        registerGenerator('vc_move_members', (block) => {
            const members = Blockly.Python.valueToCode(block, 'MEMBERS', order) || '[]';
            const toId = block.getFieldValue('TO_ID');
            return `
to_channel = self.bot.get_channel(int(${toId}))
member_ids = ${members}
if to_channel:
    for m_id in member_ids:
        member = guild.get_member(int(m_id))
        if member:
            await member.move_to(to_channel)
`;
        });

        // 権限設定ジェネレータ
        registerGenerator('vc_set_permission', (block) => {
            const channelId = block.getFieldValue('CHANNEL_ID');
            const targetId = block.getFieldValue('TARGET_ID');
            const view = block.getFieldValue('VIEW');
            const connect = block.getFieldValue('CONNECT');
            const speak = block.getFieldValue('SPEAK');

            const mapPerm = (val) => val === 'ALLOW' ? 'True' : (val === 'DENY' ? 'False' : 'None');

            return `
target_id = int(${targetId})
channel = self.bot.get_channel(int(${channelId}))
target = guild.get_role(target_id) or guild.get_member(target_id)
if channel and target:
    overwrite = channel.overwrites_for(target)
    ${view !== 'NONE' ? `overwrite.view_channel = ${mapPerm(view)}` : ''}
    ${connect !== 'NONE' ? `overwrite.connect = ${mapPerm(connect)}` : ''}
    ${speak !== 'NONE' ? `overwrite.speak = ${mapPerm(speak)}` : ''}
    await channel.set_permissions(target, overwrite=overwrite)
`;
        });

        this.updateToolbox();
    }

    updateToolbox() {
        const toolbox = document.getElementById('toolbox');
        if (!toolbox) return;

        let category = toolbox.querySelector(`category[name="${this.catName}"]`);
        if (!category) {
            category = document.createElement('category');
            category.setAttribute('name', this.catName);
            category.setAttribute('data-icon', '🔊');
            category.setAttribute('colour', '#607D8B');
            toolbox.appendChild(category);
        }

        category.innerHTML = `
            <block type="vc_move_all">
                <field name="FROM_ID">元VC_ID</field>
                <field name="TO_ID">先VC_ID</field>
            </block>
            <block type="vc_move_members">
                <field name="TO_ID">先VC_ID</field>
            </block>
            <block type="vc_set_permission">
                <field name="CHANNEL_ID">VC_ID</field>
                <field name="TARGET_ID">ユーザーorロールID</field>
            </block>
        `;

        if (this.workspace && this.workspace.updateToolbox) {
            this.workspace.updateToolbox(toolbox);
        }
    }

    unregisterBlocks() {
        const toolbox = document.getElementById('toolbox');
        if (toolbox) {
            const category = toolbox.querySelector(`category[name="${this.catName}"]`);
            if (category) {
                category.remove();
                if (this.workspace && this.workspace.updateToolbox) {
                    this.workspace.updateToolbox(toolbox);
                }
            }
        }
    }
}
