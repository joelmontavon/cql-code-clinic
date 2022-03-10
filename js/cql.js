const CQL = {
  getResults(response) {
    let entries = response.entry || [{resource: {parameter: []}}],
      results = {},
      log = '>> ' + 'Running code at ' + new Date().toLocaleString(),
      status = 'success';

    entries.forEach(function (entry) {
      let parameter = {}
      entry.resource.parameter.forEach(function (item) {
        parameter[item.name] = item.valueString
      })
      if (entry.resource.id != 'Error') {
        results[entry.resource.id] = parameter.value;
        log += '\n' + '>> ' + entry.resource.id + '=' + parameter.value;
        status = 'success'
      } else {
        results[entry.resource.id] = parameter.error;
        log += '\n' + '>> ' + entry.resource.id + ' ' + parameter.location + ' ' + parameter.error;
        status = 'error';
      }
    })

    return {
      detail: results,
      log: log,
      status: status
    };
  },
  runCode: function(code) {
    let self = this;
    return fetch("https://cql-sandbox.alphora.com/cqf-ruler-r4/fhir/$cql", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"resourceType":"Parameters","parameter":[{"name":"code","valueString":code}]})
    }).then(function(response) {
      return response.text();
    }).then(function (response) {
      results = self.getResults(JSON.parse(response));
      results.code = code;
      return results;
    });
  }
}
