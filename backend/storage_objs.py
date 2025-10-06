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
            'desc': self.description,
        }

class NutrientItem:
    def __init__(self, id, name, description, amount, user_has):
        self.id = id
        self.name = name
        self.description = description
        self.amount = amount
        self.user_has = user_has

    def to_json(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'amount': self.amount,
            'user_has': self.user_has,
        }
    
class Meal:
    def __init__(self, id, name, calories, time):
        self.id = id
        self.name = name
        self.calories = calories
        self.time = time

    def to_json(self):
        return {
            'id': self.id,
            'name': self.name,
            'calories': self.calories,
            'time': self.time
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