
## Koppr Engine APIs - Directory Structure
<pre>
koppr-engine-apis
    ├── scripts                         # Standalone scripts for dev uses
    └── server                          # Server Files
        │── config
        │   ├── environment             # Environment variables (in JSON format)
        │   │   ├── development.json
        │   │   ├── production.json
        │   │   ├── staging.json
        │   │   └── testing.json
        │   └── index.js                # Root config logic to load active enviroment config file
        ├── api                  
        │   ├── adapters                # External API Request logic handlers
        │   ├── middlewares             # Shared request middlewares 
        │   └── routes.js               # Define different services root level routes
        ├── services                    # Services implementation   
        │   ├── serviceOne
        │   ├── serviceTwo
        │   ├── ...                     # Other services
        │   └── serviceTemplate         # Services Template
        ├── db                          # Database Related Files
        │   ├── models                  # Shared Models Only
        │   ├── migrations              # Migrations (Optional)
        │   ├── seeds                   # Seeds (Optional)
        │   └── index.js                # Database instantiation
        ├── utils                       # Util libs (formats, validation, etc)
        ├── __tests__                   # Testing files
        ├── package.json           
        ├── README.md         
        └── app.js                      # App starting point
</pre>


## Service Directory Structure
<pre>
serviceTemplate
    │── config                          # Service specific configs
    │   ├── environment                 # Environment variables (in JSON format)
    │   │   ├── development.json
    │   │   ├── production.json
    │   │   ├── staging.json
    │   │   └── testing.json
    │   └── index.js                    # Service specific config logic to load active enviroment config file
    ├── model   
    │   ├── db_schemas                  # Service specific Rest API schema
    │   └── api_schemas                 # Service specific GraphQL API schema
    │       ├── gql                     # Service level Queries and Mutations
    │       └── config.json             # Config file to group all the gql dir json files (Used to generate GraphQL schema)
    ├── controller                      # Service level business logic (Rest API's)
    ├── gql_server                      # Service level business logic (GraphQL API's)
    │   └── index.js
    ├── cors.js                         # Service level cors handler (Only define logic here)
    ├── index.js                        # Service starting point
    └── package.json            
    └── README.md                       # Service related ReadME instructions
</pre>

    