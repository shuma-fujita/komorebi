// Isolated presentation layer for the OSM building tag bottom sheet.
// All selectors are scoped; no styles leak into 3D controls or other panels.
export function applyBuildingTagEditorTheme(form){
 form.classList.add('komo-tags-sheet');
 const style=document.createElement('style');
 style.textContent=`
 .komo-tags-sheet [hidden]{display:none!important;}
 .komo-tags-sheet{
  background:linear-gradient(160deg,#152c26 0%,#091a17 82%)!important;
  color:#f4fff9!important;
  border-top:1px solid rgba(190,255,213,.34);
  box-shadow:0 -14px 42px #05110d99!important;
  scrollbar-color:#769b87 #132b22;
 }
 .komo-tags-sheet .komo-grip{background:#879f94!important;}
 .komo-tags-sheet .komo-editor-header{
  display:flex;gap:9px;align-items:center;justify-content:space-between;
  margin:0 0 13px;min-width:0;
 }
 .komo-tags-sheet .komo-editor-heading{flex:1;min-width:0;}
 .komo-tags-sheet .komo-editor-heading h3{font-size:20px;line-height:1.3;margin:0;font-weight:800;overflow-wrap:anywhere;}
 .komo-tags-sheet .komo-editor-subtitle{font-size:12px;color:#a7c9ba;margin:3px 0 0;}
 .komo-tags-sheet .komo-editor-copy{
  flex:none;max-width:43%;min-height:40px;border-radius:12px;
  background:rgba(240,91,197,.11)!important;color:#ffb8e6!important;
  border:1.5px solid #f590db!important;
  box-shadow:inset 0 0 12px #f590db24,0 0 9px #f590db55;
  font:700 11px/1.35 system-ui!important;padding:7px 8px!important;
 }
 .komo-tags-sheet .komo-editor-close{
  flex:none;width:35px;height:35px;border:0;border-radius:50%;
  background:#ffffff18;color:#e4f1e9;font:300 23px/1 system-ui;
 }
 .komo-tags-sheet .komo-source-switch{
  display:grid;grid-template-columns:1fr 1fr;gap:3px;
  background:#11241e;border:1px solid #76988a;border-radius:12px;padding:3px;
  flex:1;min-width:0;
 }
 .komo-tags-sheet .komo-source-switch button{
  border:0;border-radius:9px;background:transparent;color:#c2d4cd;
  min-height:38px;font:700 13px system-ui;white-space:nowrap;
 }
 .komo-tags-sheet .komo-source-switch button[aria-pressed="true"]{
  background:linear-gradient(120deg,#a8ee7f,#c1ff9b);color:#092312;
  box-shadow:0 0 12px #a8ee7f66;
 }
 .komo-tags-sheet .komo-tag-row{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)!important;
  gap:7px!important;margin:7px 0!important;padding:7px!important;
  border:1px solid #b76eaf;border-radius:12px;
  background:linear-gradient(95deg,#46223f99,#102920dd);
  box-shadow:inset 0 0 8px #f585cb22;
 }
 .komo-tags-sheet .komo-tag-row:nth-child(3n+2){border-color:#59dfe6;background:linear-gradient(95deg,#0d424b99,#102920dd);}
 .komo-tags-sheet .komo-tag-row:nth-child(3n){border-color:#b57afa;background:linear-gradient(95deg,#38234f99,#102920dd);}
 .komo-tags-sheet .komo-tag-row input{
  box-sizing:border-box;width:100%;min-width:0;border:1px solid #ffffff2b!important;
  background:#ffffff10!important;color:#f7fff9!important;border-radius:8px!important;
  padding:8px!important;font:13px/1.45 system-ui!important;outline-offset:2px;
 }
 .komo-tags-sheet .komo-tag-row input:first-child{color:#ffb6e6!important;font-weight:700!important;}
 .komo-tags-sheet .komo-tag-row:nth-child(3n+2) input:first-child{color:#8aeeed!important;}
 .komo-tags-sheet .komo-tag-row:nth-child(3n) input:first-child{color:#d4a9ff!important;}
 .komo-tags-sheet .komo-tag-row input[readonly]{opacity:.92;cursor:default;}
 .komo-tags-sheet .komo-tag-row input::placeholder{color:#9cb8ad;}
 .komo-tags-sheet .komo-add-tag{
  display:block;width:100%;margin:15px 0 6px;border:1.5px solid #b6fb83;
  border-radius:12px;background:#b6fb8317;color:#d6ffad;font:800 15px system-ui;
  padding:13px;box-shadow:0 0 12px #9df45b55,inset 0 0 13px #9df45b1c;
 }
 .komo-tags-sheet .komo-status{
  font:12px/1.6 system-ui;color:#c6e0d2;padding:9px 10px;
  background:#b0f19e12;border:1px solid #94cf8f66;border-radius:10px;margin:10px 0 12px;
 }
 .komo-tags-sheet .komo-caption{font:700 13px system-ui;color:#e8ffef;margin:11px 0 8px;}
 .komo-tags-sheet .komo-review{border-top:1px solid #527a69;padding-top:10px;margin-top:12px;}
 .komo-tags-sheet .komo-review pre{background:#10271f!important;color:#e6f5ed!important;border:1px solid #416b58;}
 .komo-tags-sheet .komo-review p{color:#d9f8e8!important;}
 .komo-tags-sheet .komo-action{width:100%;min-height:42px;border-radius:11px!important;
  background:#a8ef88!important;color:#15321c!important;border:1px solid #b9ff9a!important;
  font:800 14px system-ui!important;}
 .komo-tags-sheet .komo-action:disabled{opacity:.5;}
 .komo-tags-sheet .komo-action-secondary{background:transparent!important;color:#c5ead6!important;border:1px solid #668978!important;}
 .komo-tags-sheet .komo-copy-pane{
  background:#15332a!important;border:1px solid #5a9c78!important;color:#e2faec!important;
 }
 .komo-tags-sheet .komo-copy-pane input{color:#133323;}
 .komo-tags-sheet .komo-copy-pane p,.komo-tags-sheet .komo-copy-pane label{color:#e2faec!important;}
 .komo-tags-sheet .komo-copy-pane pre{color:#143323!important;}
 .komo-tags-sheet .komo-copy-pane a{color:#a6efff!important;}
 .komo-tags-sheet button:focus-visible,.komo-tags-sheet input:focus-visible{outline:2px solid #a2f29e;outline-offset:2px;}
 `;
 form.prepend(style);
}
