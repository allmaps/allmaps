// // Expected output of other functions than parseIiif and getTiles is found in this JSON file:
// const functionOutput = readJSONFile(
//   path.join(__dirname, 'function-output.json')
// )

  //   if (functionOutput[file.basename]) {
  //     if (file.parsed.type !== 'image') {
  //       throw new Error('Only test function output for images!')
  //     }

  //     describe(`Functions for ${file.basename}`, () => {
  //       for (const [fn, tests] of Object.entries(functionOutput[file.basename])) {
  //         describe(`${fn}`, () => {
  //           for (const { input, output: expectedOutput } of tests) {
  //             it(`should match expected output for: ${JSON.stringify(input)}` , () => {
  //               let fnOutput
  //               let fnError

  //               try {
  //                 fnOutput = allmaps[fn](file.parsed, ...input)
  //               } catch (err) {
  //                 fnError = err
  //               }

  //               if (fnOutput) {
  //                 expect(fnOutput).to.deep.equal(expectedOutput)
  //               } else {
  //                 expect(fnError.message).to.equal(expectedOutput)
  //               }
  //             })
  //           }
  //         })
  //       }
  //     })
  //   }
  // }
