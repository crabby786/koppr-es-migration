"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GraphHTTP = require("express-graphql");
const { schemaConfigBuilder, schema_builder } = require('@cuterajat26/graphql-json-schema');
const controller_1 = require("../controller");
const configPath = '../model/api-schemas/config.json';
const schemaConfig = schemaConfigBuilder(require.resolve(configPath));
let allFields = Object.assign(Object.assign({}, schemaConfig.query.getFields()), schemaConfig.mutation.getFields());
let GQLRoot = {};
for (let key in allFields) {
    GQLRoot[key] = async (args, req) => {
        let obj = new controller_1.GQLController({});
        return obj[key](args, req);
    };
}
exports.default = GraphHTTP({
    schema: schema_builder(require.resolve(configPath)),
    rootValue: GQLRoot,
    pretty: true,
    graphiql: true
});
