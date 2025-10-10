class FoodItem:
    def __init__(self, id, name, description):
        self.id = id
        self.name = name
        self.description = description
    
    def to_json(self):
        """ 
            Has 'id', 'name' and 'desc' attributes.
            Maps to 'id', 'name', and 'description' respectively.
        """
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
        }
    
    def __str__(self):
        return "[" + self.id + ", " + self.name + ", " + self.description + "]"

class NutrientItem:
    def __init__(self, id, name, description, amount, is_eaten):
        self.id = id
        self.name = name
        self.description = description
        self.amount = amount
        self.is_eaten = is_eaten

    def to_json(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'amount': self.amount,
            'is_eaten': self.is_eaten,
        }
    
class Meal:
    def __init__(self, id, name, calories, time_aten):
        self.id = id
        self.name = name
        self.calories = calories
        self.time_aten = time_aten

    def to_json(self):
        return {
            'id': self.id,
            'name': self.name,
            'calories': self.calories,
            'time_aten': self.time_aten
        }
    
class MealTemplate:
    def __init__(self, name, calories):
        self.name = name
        self.calories = calories
    
    def to_json(self):
        return {
            'name': self.name,
            'calories': self.calories
        }