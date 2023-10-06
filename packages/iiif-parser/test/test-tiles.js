// const tilesDir = './test/tiles'
// const tilesFilename = `${tilesDir}/${basename}.tiles.json`
// if (file.parsed) {
//   if (file.expected.tiles) {
//     if (file.parsed.type !== 'image') {
//       throw new Error('Only test getTiles output for images!')
//     }

//     describe(`Tiles for ${file.basename}`, () => {
//       it('should match expected output', () => {
//         let tilesetsOutput
//         let tilesetsError

//         try {
//           tilesetsOutput = getTilesets(file.parsed)
//         } catch (err) {
//           tilesetsError = err
//         }

//         if (tilesetsOutput) {
//           expect(tilesetsOutput).to.have.deep.members(file.expected.tiles)
//         } else {
//           expect(tilesetsError.message).to.equal(file.expected.tiles)
//         }
//       })
//     })
//   }
