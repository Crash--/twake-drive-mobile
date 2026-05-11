// Side-effect import: polyfill crypto.getRandomValues (required by pouchdb-utils)
// eslint-disable-next-line import/order
import 'react-native-get-random-values'

// @ts-expect-error no types
import HttpPouch from 'pouchdb-adapter-http'
import SQLiteAdapter from 'pouchdb-adapter-react-native-sqlite'
// @ts-expect-error no types
import PouchDB from 'pouchdb-core'
// @ts-expect-error no types
import PouchDBFind from 'pouchdb-find'
// @ts-expect-error no types
import mapreduce from 'pouchdb-mapreduce'
// @ts-expect-error no types
import replication from 'pouchdb-replication'

export default PouchDB.plugin(HttpPouch)
  .plugin(PouchDBFind)
  .plugin(replication)
  .plugin(mapreduce)
  .plugin(SQLiteAdapter)
