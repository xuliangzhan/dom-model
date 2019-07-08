(function () {
  var s = Date.now()
  window.a = new DomModel({
    el: '#app',
    data: function () {
      return {
        className: 'aa',
        isActive: true,
        display: 'block',
        show: true,
        info: {
          name: 'aaaa'
        },
        styles: {
          color: 'red'
        },
        btnList: [],
        list: [
          {
            name: 'test1',
            num: 1
          },
          {
            name: 'test2',
            num: 2
          }
        ],
        tableData: [],
        tableColumn: [
          {
            prop: 'name',
            label: 'Name'
          },
          {
            prop: 'sex',
            label: 'Sex'
          },
          {
            prop: 'role',
            label: 'Role'
          },
          {
            prop: 'sex',
            label: 'Sex'
          },
          {
            prop: 'name',
            label: 'Name'
          }
        ]
      }
    },
    created: function () {
      var btnList = []
      var tableData = []
      for (var index = 0; index < 100; index++) {
        if (index < 5) {
          btnList.push({
            label: '按钮' + index
          })
        }
        tableData.push({
          name: 'test' + index,
          role: '前端',
          sex: '男',
          edit: false
        })
      }
      this.btnList = btnList
      this.tableData = tableData
    },
    render: function (h) {
      var $ = this.$
      var tableData = this.tableData
      var tableColumn = this.tableColumn
      return h('div', [
        h('div', this.btnList.map(function (item) {
          return h('button', {
            domProps: {
              innerText: $(item, 'label')
            },
            events: {
              click: function (evnt) {
                alert(item.label)
              }
            }
          })
        })),
        h('input', {
          visible: function () {
            return this.show
          },
          class: ['hhh', $(this, 'className'), {
            active: $(this, 'isActive')
          }],
          style: {
            display: $(this, 'display')
          },
          domProps: {
            type: 'text',
            value: $(this.info, 'name')
          },
          events: {
            input: function (evnt) {
              this.info.name = evnt.target.value
            }
          }
        }, []),
        h('div', this.list.map(function (item) {
          return h('input', {
            domProps: {
              type: 'text',
              value: $(item, 'name')
            },
            events: {
              input: function (evnt) {
                item.age = evnt.target.value
              }
            }
          }, [])
        })),
        h('table', [
          h('thead', [
            h('tr', tableColumn.map(function (column) {
              return h('th', column.label)
            }))
          ]),
          h('tbody', tableData.map(function (row) {
            return h('tr', tableColumn.map(function (column) {
              return h('td', {
                events: {
                  click: function (evnt) {
                    row.edit = true
                  }
                }
              }, [
                h('span', {
                  visible: function () {
                    return !row.edit
                  }
                }, $(row, column.prop)),
                h('input', {
                  visible: function () {
                    return row.edit
                  },
                  domProps: {
                    type: 'text'
                  }
                })
              ])
            }))
          }))
        ])
      ])
    }
  })
  console.log(Date.now() - s)
})()
