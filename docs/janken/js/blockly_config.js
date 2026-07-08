// blockly_config.js

// ブロックの定義
const customBlocks = [
    {
        "type": "cmd_start",
        "message0": "プログラムスタート",
        "nextStatement": null,
        "colour": "#ffbf00",
        "tooltip": "マイコン側で待機処理を行います"
    },
    {
        "type": "cmd_if_else",
        "message0": "もし ～なら %1",
        "args0": [{"type": "input_value", "name": "if_jeken"}],
        "message1": "YES %1",
        "args1": [{"type": "input_statement", "name": "yes"}],
        "message2": "NO %1",
        "args2": [{"type": "input_statement", "name": "no"}],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#ffab19",
        "tooltip": "分岐処理を行います"
    },
    {
        "type": "if_block_win",
        "message0": "じゃんけんに勝ったなら",
        "output": null,
        "colour": "#59c059"
    },
    {
        "type": "if_block_lose",
        "message0": "じゃんけんに負けたなら",
        "output": null,
        "colour": "#59c059"
    },
    {
        "type": "cmd_speak_win",
        "message0": " %1 としゃべる",
        "args0": [{"type": "field_input", "name": "TEXT", "text": "あなたのかち"}],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 160
    },
    {
        "type": "cmd_speak_lose",
        "message0": " %1 としゃべる",
        "args0": [{"type": "field_input", "name": "TEXT", "text": "あなたのまけ"}],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 160
    },
    {
        "type": "cmd_janken",
        "message0": "じゃんけんをする",
        "previousStatement": null,
        "nextStatement": null,
        "colour": 180
    }
];

// ブロックの登録
Blockly.defineBlocksWithJsonArray(customBlocks);

// 最初から配置しておきたいブロックの定義（JSON形式）
const defaultBlocksJson = {
    "blocks": {
        "blocks": [
            {
                "type": "cmd_start",
                "x": 40, "y": 40,
                "next": {
                    "block": {
                        "type": "cmd_if_else",
                        "inputs": {
                            "if_jeken": { "block": { "type": "if_block_win" } },
                            "yes": { "block": { "type": "cmd_speak_win" } },
                            "no": { "block": { "type": "cmd_speak_lose" } }
                        }
                    }
                }
            }
        ]
    }
};
