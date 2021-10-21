

import GraphHTTP = require('express-graphql');
const { schemaConfigBuilder, schema_builder } = require('@cuterajat26/graphql-json-schema');
import { GQLController } from "../controller";

const configPath = '../model/api-schemas/config.json';
const schemaConfig = schemaConfigBuilder(require.resolve(configPath));

let allFields = { ...schemaConfig.query.getFields(), ...schemaConfig.mutation.getFields() }

let GQLRoot = {};
for (let key in allFields) {
    GQLRoot[key] = async (args: any, req: any) => {
        let obj = new GQLController({})
        return obj[key](args, req);
    }
}

export default GraphHTTP({
    schema: schema_builder(require.resolve(configPath)),
    rootValue: GQLRoot,
    pretty: true,
    graphiql: true
})
