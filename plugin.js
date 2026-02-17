class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.catName = 'ボイスチャットマネージャー';
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
                    .appendField(new Blockly.FieldTextInput("元ID"), "FROM_ID")
                    .appendField("の全員を")
                    .appendField(new Blockly.FieldTextInput("先ID"), "TO_ID")
                    .appendField("へ移動");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(160);
                this.setTooltip("指定したチャンネルにいる全員を別のチャンネルへ一括移動させます。");
            }
        };

        // 2. VC全員切断
        Blockly.Blocks['vc_disconnect_all'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🔊 チャンネル")
                    .appendField(new Blockly.FieldTextInput("チャンネルID"), "CHANNEL_ID")
                    .appendField("内の全員を切断させる");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(160);
                this.setTooltip("指定したチャンネルにいる全員をボイスチャンネルから切断させます。");
            }
        };

        // 3. 特定ユーザー切断
        Blockly.Blocks['vc_disconnect_member'] = {
            init: function () {
                this.appendValueInput("USER")
                    .setCheck(null)
                    .appendField("👤 ");
                this.appendDummyInput()
                    .appendField("をボイスチャンネルから切断させる");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(160);
                this.setTooltip("指定したユーザーをボイスチャンネルから切断させます。IDまたはメンバーオブジェクトを指定してください。");
            }
        };

        // 4. 人数制限操作
        Blockly.Blocks['vc_set_user_limit'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("📏 VC")
                    .appendField(new Blockly.FieldTextInput("チャンネルID"), "CHANNEL_ID")
                    .appendField("の接続可能人数を");
                this.appendDummyInput()
                    .appendField(new Blockly.FieldNumber(0, 0, 99), "NUM")
                    .appendField(new Blockly.FieldDropdown([
                        ["人増やす", "ADD"],
                        ["人減らす", "SUB"],
                        ["人にセットする", "SET"],
                        ["無限(なし)にする", "INF"]
                    ]), "MODE");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(160);
                this.setTooltip("ボイスチャンネルの人数制限を動的に変更します。");
            }
        };

        // 5. サーバーミュート/タイムアウト (期間指定)
        Blockly.Blocks['vc_timeout_member'] = {
            init: function () {
                this.appendValueInput("USER")
                    .setCheck(null)
                    .appendField("👤 ");
                this.appendDummyInput()
                    .appendField("をタイムアウトさせる");
                this.appendDummyInput()
                    .appendField("期間:")
                    .appendField(new Blockly.FieldTextInput("30s, 5m, 1h, 1d等"), "DURATION");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(20);
                this.setTooltip("ユーザーを指定期間タイムアウト(Communication Disabled)にします。最大30日間まで。");
            }
        };

        // 6. 権限設定 (表示/接続/発言)
        Blockly.Blocks['vc_set_permission'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🔐 チャンネル")
                    .appendField(new Blockly.FieldTextInput("ID"), "CHANNEL_ID")
                    .appendField("の対象")
                    .appendField(new Blockly.FieldTextInput("ID"), "TARGET_ID");
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

        const registerGenerator = (id, fn) => {
            if (Blockly.Python) {
                if (Blockly.Python.forBlock) {
                    Blockly.Python.forBlock[id] = fn;
                }
                Blockly.Python[id] = fn;
            }
        };

        // ジェネレータ実装
        registerGenerator('vc_move_all', (block) => {
            const fromId = block.getFieldValue('FROM_ID');
            const toId = block.getFieldValue('TO_ID');
            return `
channel_from = self.bot.get_channel(int(${fromId}))
channel_to = self.bot.get_channel(int(${toId}))
if channel_from and channel_to:
    for member in channel_from.members:
        await member.move_to(channel_to)
`;
        });

        registerGenerator('vc_disconnect_all', (block) => {
            const channelId = block.getFieldValue('CHANNEL_ID');
            return `
channel = self.bot.get_channel(int(${channelId}))
if channel:
    for member in channel.members:
        await member.move_to(None)
`;
        });

        registerGenerator('vc_disconnect_member', (block) => {
            const user = Blockly.Python.valueToCode(block, 'USER', 0) || 'None';
            return `
target = ${user}
member = guild.get_member(int(target)) if isinstance(target, (int, str)) else target
if member and hasattr(member, "move_to"):
    await member.move_to(None)
`;
        });

        registerGenerator('vc_set_user_limit', (block) => {
            const channelId = block.getFieldValue('CHANNEL_ID');
            const num = block.getFieldValue('NUM');
            const mode = block.getFieldValue('MODE');

            let calc = `int(${num})`;
            if (mode === 'INF') calc = '0';
            else if (mode === 'ADD') calc = `channel.user_limit + int(${num})`;
            else if (mode === 'SUB') calc = `max(0, channel.user_limit - int(${num}))`;

            return `
channel = self.bot.get_channel(int(${channelId}))
if channel:
    await channel.edit(user_limit=${calc})
`;
        });

        registerGenerator('vc_timeout_member', (block) => {
            const user = Blockly.Python.valueToCode(block, 'USER', 0) || 'None';
            const duration = block.getFieldValue('DURATION');

            if (Blockly.Python) {
                Blockly.Python.definitions_['import_re'] = 'import re';
                Blockly.Python.definitions_['from_datetime_import_timedelta'] = 'from datetime import timedelta';
            }

            return `
target = ${user}
member = guild.get_member(int(target)) if isinstance(target, (int, str)) else target
dur_str = "${duration}"
if member:
    times = {"d": 0, "h": 0, "m": 0, "s": 0}
    matches = re.findall(r"(\\d+)([dhms])", dur_str)
    for v, k in matches: times[k] = int(v)
    td = timedelta(days=times["d"], hours=times["h"], minutes=times["m"], seconds=times["s"])
    if td.total_seconds() > 0:
        await member.timeout(td)
`;
        });

        registerGenerator('vc_set_permission', (block) => {
            const channelId = block.getFieldValue('CHANNEL_ID');
            const targetId = block.getFieldValue('TARGET_ID');
            const view = block.getFieldValue('VIEW');
            const connect = block.getFieldValue('CONNECT');
            const speak = block.getFieldValue('SPEAK');

            const mapPerm = (val) => val === 'ALLOW' ? 'True' : (val === 'DENY' ? 'False' : 'None');

            return `
t_id = int(${targetId})
channel = self.bot.get_channel(int(${channelId}))
target = guild.get_role(t_id) or guild.get_member(t_id)
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
            <block type="vc_move_all"></block>
            <block type="vc_disconnect_all"></block>
            <block type="vc_disconnect_member"></block>
            <block type="vc_set_user_limit"></block>
            <block type="vc_timeout_member"></block>
            <block type="vc_set_permission"></block>
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
