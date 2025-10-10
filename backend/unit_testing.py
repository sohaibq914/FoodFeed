from supabase_access_nutrition import *

def test_get_foods_with_restrictions(id, type, expected):
    actual = get_elligble_foods_type(id, type)
    if len(actual) != len(expected):
        print("Error: Lengths are different. " + str(len(actual)) + " vs. " + str(len(expected)))
        return False
    for item in actual:
        food_item = item[1]
        if food_item.name not in expected:
            print("Error: Could not find " + food_item.name)
            return False
        expected.remove(food_item.name)
    return True    

# Using 3 ids:
# first has restrictions of 'Pescatarian'
# second has restrictions of 'Acidic' & 'Vegan' (do not overlap)
# third has no restrictions.
#
# Note: Restrictions mainly affect proteins, so this section will be checked the most.

if __name__ == '__main__':
    first = 'b9b12258-49c9-4fcf-9caf-6bcecfb31aa6'
    second = '1c913ec3-78f7-4c20-a504-167093ea73ec'
    third = 'fe4e13f5-5861-4bdc-8128-9c372243fd55'

    expected = {'Corn', 'Onion', 'Spinach', 'Brocoli', 'Carrot', 'Bell Pepper', 'Lettuce'}
    test_get_foods_with_restrictions(first, 'vegetable', expected)

    expected = {'Avocado', 'Tomato', 'Cherry', 'Blueberry', 'Apple', 'Grape', 'Banana'}
    test_get_foods_with_restrictions(first, 'fruit', expected)

    expected = {'Tuna', 'Salmon', 'Tofu'}
    test_get_foods_with_restrictions(first, 'protein', expected)

    expected = {'Corn', 'Onion', 'Spinach', 'Brocoli', 'Carrot', 'Bell Pepper', 'Lettuce'}
    test_get_foods_with_restrictions(second, 'vegetable', expected)

    expected = {'Avocado', 'Cherry', 'Blueberry', 'Apple', 'Grape', 'Banana'}
    test_get_foods_with_restrictions(second, 'fruit', expected)

    expected = {'Tofu'}
    test_get_foods_with_restrictions(second, 'protein', expected)

    expected = {'Corn', 'Onion', 'Spinach', 'Brocoli', 'Carrot', 'Bell Pepper', 'Lettuce'}
    test_get_foods_with_restrictions(third, 'vegetable', expected)

    expected = {'Avocado', 'Tomato', 'Cherry', 'Blueberry', 'Apple', 'Grape', 'Banana'}
    test_get_foods_with_restrictions(third, 'fruit', expected)

    expected = {'Beef', 'Chicken', 'Pork', 'Goat', 'Tuna', 'Salmon', 'Tofu'}
    test_get_foods_with_restrictions(third, 'protein', expected)
    print("Completed all tests!")
