const App = {
    data () {
      return {
        index: 0,
        exercises: Exercises,
        log: '',
        status: '',
        drawer: false
      }
    },
    methods: {
      goTo(index) {
        this.index = index;
        this.drawer = false;
      },
      pageForward() {
        this.index = Math.min(this.index + 1, this.exercises.length - 1)
      },
      pageBack() {
        this.index = Math.max(this.index - 1, 0)
      },
      runCode(code) {
        let self = this;
        this.status = 'running';
        this.exercises[this.index].tabs[0].code = code;
        let tab = this.exercises[this.index].tabs[0];
        CQL.runCode(tab.code).then(function (results) {
          self.log += ((self.log.length ? '\n' : '') + results.log);
          self.status = results.status;
        })
      },
      score(answers, key, cb) {
        cb = cb || function (answers, key) {
          return Object.keys(key.detail).map(function(i) {
            try {
              return key.detail[i] == answers.detail[i];
            } catch {
              return false;
            }
          }).reduce(function (prev, cur) {
            return prev && cur;
          }, true);
        }
        return cb(answers, key);
      },
      submitAnswer(code) {
        let self = this;
        this.status = 'submitting';
        this.exercises[this.index].tabs[0].code = code;
        let tab = this.exercises[this.index].tabs[0],
          answers = {},
          key = {};
        CQL.runCode(tab.code).then(function (results) {
          answers = results;
          return CQL.runCode(tab.key).then(function (results) {
            key = results;
          })
        }).then(function() {
          if (self.score(answers, key, tab.eval)) {
            self.$alert('You got it! On to the next one.', 'Congrats!', {
              confirmButtonText: 'OK',
              cancelButtonText: 'Cancel',
              callback: function () {
                self.log = '';
                self.pageForward();
              }
            });
          } else {
            self.$alert('Please try again.', 'Sorry', {
              confirmButtonText: 'OK',
            });
          }
          self.status = '';
        })

      },
      clearLog() {
        this.status = '';
        this.log = '';
      }
    },
    computed: {
      currentExercise() {
        return this.exercises[this.index];
      }
    },
    mounted() {

    }
}

var app = Vue.createApp(App);
app.use(ElementPlus);
app.component('code-editor', CodeEditor);
app.component('code-logger', CodeLogger);
app.component('instruct-able', InstructAble);
app.mount('#app')
