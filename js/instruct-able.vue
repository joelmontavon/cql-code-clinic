InstructAble = {
  template: `
  <el-card>
    <template #header>
      <div class="card-header">
        <span>{{exercise.name}}</span>
      </div>
    </template>
    <div v-html="content">
    </div>
  </el-card>
  `,
  props: {
    exercise: {
      type: Array,
      default: []
    }
  },
  computed: {
    content() {
      return this.exercise.content;
    }
  },
  methods: {
    renderExercise() {
      /*let els = this.exercise.instructions.map(function (el) {
        return Vue.h(el.type, el.props, el.children)
      })
      return els;*/
      let els = this.exercise.instructions.map(function (el) {
        return el
      })
      return els;
    }
  }
}
