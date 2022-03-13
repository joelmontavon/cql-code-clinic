const CodeLogger = {
  template: `
  <el-card>
    <template #header>
      <div class="card-header">
        <span>Log</span>
        <i v-show="status=='error'"class="fa-solid fa-circle-exclamation" style="color: rgb(245, 108, 108);"></i>
        <i v-show="status=='success'" class="fa-solid fa-circle-check" style="color: rgb(103, 194, 58);"></i>
        <el-button type="info" @click="clear">Clear</el-button>
      </div>
    </template>
    <div class="editor-wrapper" :style="getStyle">
      <div class="editor" ref="editor" style="position: relative; width: 100%; height: 100%;"></div>
    </div>
  </el-card>
  `,
  data() {
    return {
      editor: {}
    };
  },
  props: {
    text: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: "100%"
    },
    width: {
      type: String,
      default: "100%"
    },
    onClear: {
      type: Function
    }
  },
  watch: {
    text(newText, oldText) {
      this.editor.setValue(newText);
      this.editor.clearSelection();
    }
  },
  methods: {
    clear() {
      return this.onClear();
    }
  },
  computed: {
    getStyle() {
      return {
        height: this.height,
        width: this.width
      }
    }
  },
  mounted() {
    this.editor = ace.edit(this.$refs.editor);
    this.editor.setTheme("ace/theme/github");
    //this.editor.session.setMode("ace/mode/javascript");
    this.editor.setFontSize(16);
    this.editor.setShowPrintMargin(false);
    this.editor.renderer.setShowGutter(false);
    this.editor.setReadOnly(true);
  }
}
