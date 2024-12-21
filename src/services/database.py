import os
import sqlite3


class Database:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self.cur = self.conn.cursor()

    def execute(self, query, params=None):
        try:
            if params is None:
                self.cur.execute(query)
            else:
                self.cur.execute(query, params)
            self.conn.commit()
        except sqlite3.DatabaseError as e:
            print(f"Database error: {e}")
            self.close()

        return self

    def fetchone(self):
        try:
            return self.cur.fetchone()
        except sqlite3.DatabaseError as e:
            print(f"Database error: {e}")
            self.close()

    def fetchall(self):
        try:
            return self.cur.fetchall()
        except sqlite3.DatabaseError as e:
            print(f"Database error: {e}")
            self.close()

    def close(self):
        self.cur.close()
        self.conn.close()
