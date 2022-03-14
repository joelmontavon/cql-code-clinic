const CodeEditor = {
  template: `
  <el-card>
    <template #header>
      <div class="card-header">
        <span class="h3">Code Editor</span>
        <div style="align-items: end;">
          <el-button type="primary" @click="reset" plain><i class="fa-solid fa-rotate-left" style="font-size: 16px;"></i></el-button>
          <el-button type="primary" @click="cheat" plain><i class="fa-solid fa-key" style="font-size: 16px;"></i></el-button>
          <el-button type="primary" @click="run" :loading="status == 'running'" plain>{{getRunBtnText}}</el-button>
          <el-button type="primary" @click="submit" :loading="status == 'submitting'">{{getSubmitBtnText}}</el-button>
        </div>
      </div>
    </template>
    <el-tabs type="border-card">
      <el-tab-pane :label="exercise.tabs[0].name">
        <div class="editor-wrapper" :style="getStyle">
          <div class="editor" ref="editor" style="position: relative; width: 100%; height: 100%; white-space: pre;"></div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
  `,
  data() {
    return {
      editor: {}
    };
  },
  props: {
    exercise: {
      type: Object,
      default: {}
    },
    status: {
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
    onReset: {
      type: Function,
      default: function() {}
    },
    onRun: {
      type: Function,
      default: function() {}
    },
    onSubmit: {
      type: Function,
      default: function() {}
    }
  },
  watch: {
    exercise(newEx, oldEx) {
      this.init();
    }
  },
  methods: {
    init() {
      this.editor = ace.edit(this.$refs.editor);
      this.editor.setTheme("ace/theme/github");
      this.editor.session.setMode("ace/mode/python");
      this.editor.setFontSize(16);
      this.editor.setShowPrintMargin(false);
      this.reset();
    },
    reset() {
      this.editor.setValue(this.exercise.tabs[0].template);
      this.editor.clearSelection();
      return this.onReset()
    },
    cheat() {
      this.editor.setValue(this.exercise.tabs[0].key);
      return this.onReset()
    },
    run() {
      this.onRun(this.editor.getValue());
    },
    submit() {
      this.onSubmit(this.editor.getValue());
    }
  },
  computed: {
    getStyle() {
      return {
        height: this.height,
        width: this.width
      }
    },
    getRunBtnText() {
      return this.status != 'running' ? 'Run Code' : 'Loading'
    },
    getSubmitBtnText() {
      return this.status != 'submitting' ? 'Submit Answer' : 'Loading'
    }
  },
  mounted() {
    this.init();
  }
}
