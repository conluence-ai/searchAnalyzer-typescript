import { Pool } from 'pg';


class DatabaseAdapter {
    private dbConnection: Pool;

    constructor(connectionString: string) {
        this.dbConnection = new Pool({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false 
            }
        });
    }

    async loadBrands(){
        const query = `SELECT Brand.name as "name"
FROM "Brand" AS Brand`

        const result = await this.dbConnection.query(query);

        return result.rows;
    }

    async loadProductNames(){
        const query = `SELECT product.name as "name"
FROM "product" WHERE product."isPublished" = TRUE`

    const result =  await this.dbConnection.query(query);
    return result.rows;
    }

    close(){
        console.log("Closing database connection");
        if (this.dbConnection) {
            this.dbConnection.end()
                .then(() => {
                    console.log("Database connection closed");
                })
                .catch((err) => {
                    console.error("Error closing database connection", err);
                });
        } else {
            console.log("Database connection closed");
        }
    }
}

export default DatabaseAdapter