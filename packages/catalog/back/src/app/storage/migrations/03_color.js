const table = "color";

module.exports = {
  up(query, DataTypes) {
    return query.createTable(table, {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      key: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    });
  },
  down(query) {
    return query.dropTable(table);
  },
};
