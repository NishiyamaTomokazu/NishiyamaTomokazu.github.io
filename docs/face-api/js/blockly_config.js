// js/blockly_config.js

// 1. オリジナルブロックのデザインと入力項目の定義
Blockly.defineBlocksWithJsonArray([
    {
        "type": "face_auth_start",
        "message0": "金庫の鍵を開けるボタンを押した時",
        "nextStatement": null,
        "colour": "#ffbf00"
    },
    {
        "type": "face_auth_check",
        "message0": "もし顔が認証されたら %1 ⭕ YES %2 ❌ NO %3",
        "args0": [
            { "type": "input_dummy" },
            { "type": "input_statement", "name": "YES" },
            { "type": "input_statement", "name": "NO" }
        ],
        "previousStatement": null,
        "colour": "#e9b151"
    },
    {
        "type": "face_auth_speak",
        "message0": "🗣 %1 としゃべる",
        "args0": [
            { "type": "field_input", "name": "TEXT", "text": "顔が認証されました" }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 120
    },
    {
        "type": "face_auth_led",
        "message0": "💡 %1 のLEDを %2 秒点灯する",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "COLOR",
                "options": [
                    ["赤", "red"],
                    ["緑", "green"],
                    ["青", "blue"],
                    ["黄色", "yellow"],
                    ["紫", "purple"],
                    ["水色", "cyan"],
                    ["白", "white"]
                ]
            },
            { "type": "field_number", "name": "TIME", "value": 1, "min": 1, "max": 63 }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 180
    }
]);

// 2. 画面を開いたときに最初から配置されているブロックのデータ
const defaultBlocksJsonStep4 = {
    "blocks": {
        "languageVersion": 0,
        "blocks": [
            {
                "type": "face_auth_start",
                "x": 20,
                "y": 20,
                "deletable": false,
                "movable": false,
                "next": {
                    "block": {
                        "type": "face_auth_check",
                        "deletable": false,
                        "movable": true,
                        "inputs": {
                            "YES": {
                                "block": {
                                    "type": "face_auth_speak",
                                    "deletable": false,
                                    "fields": { "TEXT": "顔が認証されました" },
                                    "next": {
                                        "block": {
                                            "type": "face_auth_led",
                                            "deletable": false,
                                            "fields": { "COLOR": "green", "TIME": 1 }
                                        }
                                    }
                                }
                            },
                            "NO": {
                                "block": {
                                    "type": "face_auth_speak",
                                    "deletable": false,
                                    "fields": { "TEXT": "顔が認証されませんでした" },
                                    "next": {
                                        "block": {
                                            "type": "face_auth_led",
                                            "deletable": false,
                                            "fields": { "COLOR": "red", "TIME": 1 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]
    }
};

// --- blockly_config.js の一番下に追記 ---

// 「音を鳴らす」ブロックの定義
Blockly.Blocks['cmd_sound'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🎵")
            .appendField(new Blockly.FieldDropdown([
                ["確認音1", "150"],
                ["確認音2", "151"],
                ["確認音3", "152"],
                ["音楽再生", "153"]
            ]), "SOUND")
            .appendField("を鳴らす");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
    }
};

// ステップ5用の初期配置（中身を空にしてユーザーが組めるようにする）
const defaultBlocksJsonStep5 = {
    "blocks": {
        "languageVersion": 0,
        "blocks": [
            {
                "type": "face_auth_start",
                "x": 200,
                "y": 30,
                "deletable": false,
                "movable": true,
                "next": {
                    "block": {
                        "type": "face_auth_check",
                        "deletable": false,

                    }
                }
            }
        ]
    }
};