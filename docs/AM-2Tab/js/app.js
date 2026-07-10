document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. タブの自動ハイライト機能
    // ==========================================
    // 現在のURLを取得し、どのstepファイルを開いているか判定する
    const currentPath = window.location.pathname;
    
    // step1〜step6のIDリスト
    const stepIds = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
    
    stepIds.forEach(step => {
        // URLに 'step1.html' などが含まれていれば、そのタブに 'active' クラスを付与
        if (currentPath.includes(step)) {
            const activeTab = document.getElementById(`tab-${step}`);
            if (activeTab) {
                activeTab.classList.add('active');
            }
        }
    });

    // ==========================================
    // 2. Blocklyのワークスペースを初期化
    // ==========================================
    const toolbox = document.getElementById('toolbox');
    const blocklyDiv = document.getElementById('blocklyDiv');

    const workspace = Blockly.inject(blocklyDiv, {
        toolbox: toolbox,
        scrollbars: true,
        trashcan: true,
        // 中学生向けにズーム機能があると便利です
        zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        }
    });

    // ウィンドウサイズが変わった時にBlocklyのサイズを自動調整
    window.addEventListener('resize', () => {
        Blockly.svgResize(workspace);
    }, false);

    // ==========================================
    // 3. プログラムの保存と読み込み（前回ご提案した機能）
    // ==========================================
    
    // 保存（ほぞんする）ボタン
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const state = Blockly.serialization.workspaces.save(workspace);
            const jsonText = JSON.stringify(state, null, 2);
            const blob = new Blob([jsonText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
            a.download = `aurora_program_${dateStr}.json`; 
            
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // 読み込み（ひらく）ボタン
    const loadBtn = document.getElementById('loadBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (loadBtn && fileInput) {
        loadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonText = e.target.result;
                    const state = JSON.parse(jsonText);
                    workspace.clear();
                    Blockly.serialization.workspaces.load(state, workspace);
                    alert('プログラムを読み込みました！');
                } catch (err) {
                    alert('ファイルの読み込みに失敗しました。');
                    console.error(err);
                }
                fileInput.value = ''; // リセット
            };
            reader.readAsText(file);
        });
    }
});
