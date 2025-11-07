class FoodItem:
    def __init__(self, id, name, description, favorite):
        self.id = id
        self.name = name
        self.description = description
        self.favorite = favorite
    
    def to_json(self):
        """ 
            Has 'id', 'name' and 'desc' attributes.
            Maps to 'id', 'name', and 'description' respectively.
        """
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'favorite': self.favorite
        }
    
    def __str__(self):
        return "[" + self.id + ", " + self.name + ", " + self.description + ", " + self.favorite + "]"

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

class FoodForm:
    def __init__(self, id, name, type, description, user_id, status):
        self.id = id
        self.name = name
        self.type = type
        self.description = description
        self.user_id = user_id
        self.status = status

    def to_json(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'desc': self.description,
            'user_id': self.user_id,
            'status': self.status
        }
    
class PlanComponent:
    def __init__(self, id, food_id, amount):
        self.id = id
        self.food_id = food_id
        self.amount = amount
    
    def to_json(self):
        return {
            'id': self.id,
            'food_id': self.food_id,
            'amount': self.amount
        }

class Plan:
    def __init__(self, plan_id, components):
        self.plan_id = plan_id
        self.components = components

    def to_json(self):
        return {
            'plan_id': self.plan_id,
            'components': [comp.to_json() for comp in self.components]
        }