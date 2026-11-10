const fs = require('fs');

const snippets = [
  // --- HELLO WORLD ---
  {
    id: "hello-world-python",
    title: "Hello World in Python",
    language: "python",
    category: "basics",
    tags: ["hello world", "basic", "intro", "print"],
    description: "The simplest Python program using the built-in print() function.",
    code: `# Hello World in Python
print("Hello, World!")`
  },
  {
    id: "hello-world-java",
    title: "Hello World in Java",
    language: "java",
    category: "basics",
    tags: ["hello world", "basic", "intro", "main class"],
    description: "Standard entry-point Java program with public static void main.",
    code: `// Hello World in Java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`
  },
  {
    id: "hello-world-c",
    title: "Hello World in C",
    language: "c",
    category: "basics",
    tags: ["hello world", "basic", "intro", "printf", "stdio"],
    description: "Standard introductory C program with stdio.h and main function.",
    code: `// Hello World in C
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`
  },
  {
    id: "hello-world-cpp",
    title: "Hello World in C++",
    language: "cpp",
    category: "basics",
    tags: ["hello world", "basic", "intro", "cout", "iostream"],
    description: "Standard C++ hello world using iostream and std::cout.",
    code: `// Hello World in C++
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`
  },
  {
    id: "hello-world-js",
    title: "Hello World in JavaScript",
    language: "javascript",
    category: "basics",
    tags: ["hello world", "basic", "intro", "console.log"],
    description: "Standard JavaScript output using console.log.",
    code: `// Hello World in JavaScript
console.log("Hello, World!");`
  },

  // --- FIBONACCI ---
  {
    id: "fibonacci-python",
    title: "Fibonacci Series in Python",
    language: "python",
    category: "algorithms",
    tags: ["fibonacci", "series", "sequence", "iterative", "math"],
    description: "Generates the Fibonacci series up to n terms iteratively.",
    code: `def fibonacci(n):
    a, b = 0, 1
    series = []
    for _ in range(n):
        series.append(a)
        a, b = b, a + b
    return series

# Example usage:
n = 10
print(f"Fibonacci series of {n} terms: {fibonacci(n)}")
# Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`
  },
  {
    id: "fibonacci-recursive-python",
    title: "Recursive Fibonacci in Python",
    language: "python",
    category: "algorithms",
    tags: ["fibonacci", "recursion", "recursive"],
    description: "Calculates the nth Fibonacci number using recursion.",
    code: `def fibonacci_recursive(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)

# Print first 8 numbers:
for i in range(8):
    print(fibonacci_recursive(i), end=" ")
# Output: 0 1 1 2 3 5 8 13`
  },
  {
    id: "fibonacci-java",
    title: "Fibonacci Series in Java",
    language: "java",
    category: "algorithms",
    tags: ["fibonacci", "series", "loop"],
    description: "Prints first n Fibonacci numbers using an iterative loop in Java.",
    code: `public class Fibonacci {
    public static void main(String[] args) {
        int n = 10;
        int first = 0, second = 1;
        System.out.print("Fibonacci Series: ");

        for (int i = 1; i <= n; ++i) {
            System.out.print(first + " ");
            int next = first + second;
            first = second;
            second = next;
        }
    }
}`
  },
  {
    id: "fibonacci-c",
    title: "Fibonacci Series in C",
    language: "c",
    category: "algorithms",
    tags: ["fibonacci", "series", "c programming"],
    description: "Iterative calculation of Fibonacci series in C.",
    code: `#include <stdio.h>

int main() {
    int n = 10, t1 = 0, t2 = 1, nextTerm;
    printf("Fibonacci Series: ");

    for (int i = 1; i <= n; ++i) {
        printf("%d, ", t1);
        nextTerm = t1 + t2;
        t1 = t2;
        t2 = nextTerm;
    }
    return 0;
}`
  },
  {
    id: "fibonacci-cpp",
    title: "Fibonacci Series in C++",
    language: "cpp",
    category: "algorithms",
    tags: ["fibonacci", "cpp"],
    description: "Fibonacci series generator in modern C++.",
    code: `#include <iostream>
using namespace std;

int main() {
    int n = 10, t1 = 0, t2 = 1, nextTerm = 0;
    cout << "Fibonacci Series: ";

    for (int i = 1; i <= n; ++i) {
        cout << t1 << " ";
        nextTerm = t1 + t2;
        t1 = t2;
        t2 = nextTerm;
    }
    cout << endl;
    return 0;
}`
  },

  // --- FACTORIAL ---
  {
    id: "factorial-python",
    title: "Factorial in Python",
    language: "python",
    category: "algorithms",
    tags: ["factorial", "math", "recursive"],
    description: "Calculates the factorial of a non-negative integer using recursion and iteration.",
    code: `def factorial(n):
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers.")
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

# Example:
num = 5
print(f"Factorial of {num} is {factorial(num)}")  # Output: 120`
  },
  {
    id: "factorial-java",
    title: "Factorial in Java",
    language: "java",
    category: "algorithms",
    tags: ["factorial", "loop"],
    description: "Calculates the factorial of a number using a loop in Java.",
    code: `public class Factorial {
    public static long calculateFactorial(int n) {
        long fact = 1;
        for (int i = 1; i <= n; i++) {
            fact *= i;
        }
        return fact;
    }

    public static void main(String[] args) {
        int num = 6;
        System.out.println("Factorial of " + num + " = " + calculateFactorial(num));
        // Output: 720
    }
}`
  },
  {
    id: "factorial-c",
    title: "Factorial in C",
    language: "c",
    category: "algorithms",
    tags: ["factorial", "math", "c"],
    description: "Computes factorial of a given number in C.",
    code: `#include <stdio.h>

long long factorial(int n) {
    long long fact = 1;
    for (int i = 1; i <= n; ++i) {
        fact *= i;
    }
    return fact;
}

int main() {
    int num = 5;
    printf("Factorial of %d = %lld\\n", num, factorial(num));
    return 0;
}`
  },

  // --- PRIME NUMBER ---
  {
    id: "prime-check-python",
    title: "Prime Number Check in Python",
    language: "python",
    category: "algorithms",
    tags: ["prime", "prime number", "check prime", "math"],
    description: "Efficiently checks whether a given integer is prime in O(sqrt(n)) time.",
    code: `import math

def is_prime(n):
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    # Check divisors up to square root of n
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

# Example:
print(is_prime(29))  # True
print(is_prime(30))  # False`
  },
  {
    id: "prime-check-java",
    title: "Prime Number Check in Java",
    language: "java",
    category: "algorithms",
    tags: ["prime", "prime number", "java"],
    description: "Determines if a number is prime using sqrt(n) bound in Java.",
    code: `public class PrimeCheck {
    public static boolean isPrime(int n) {
        if (n <= 1) return false;
        for (int i = 2; i <= Math.sqrt(n); i++) {
            if (n % i == 0) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        int n = 17;
        System.out.println(n + " is prime? " + isPrime(n)); // true
    }
}`
  },
  {
    id: "prime-check-c",
    title: "Prime Number Check in C",
    language: "c",
    category: "algorithms",
    tags: ["prime", "check prime", "c"],
    description: "C function to test whether an integer is prime.",
    code: `#include <stdio.h>
#include <stdbool.h>

bool isPrime(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int n = 23;
    if (isPrime(n)) printf("%d is a prime number.\\n", n);
    else printf("%d is not a prime number.\\n", n);
    return 0;
}`
  },

  // --- PALINDROME ---
  {
    id: "palindrome-python",
    title: "Palindrome String & Number in Python",
    language: "python",
    category: "algorithms",
    tags: ["palindrome", "string palindrome", "reverse"],
    description: "Checks if a string or number reads the same forwards and backwards.",
    code: `def is_palindrome_string(s):
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

def is_palindrome_number(n):
    temp = n
    rev = 0
    while n > 0:
        rev = (rev * 10) + (n % 10)
        n //= 10
    return temp == rev

print(is_palindrome_string("A man, a plan, a canal: Panama"))  # True
print(is_palindrome_number(12321))                              # True`
  },
  {
    id: "palindrome-java",
    title: "Palindrome Check in Java",
    language: "java",
    category: "algorithms",
    tags: ["palindrome", "string", "java"],
    description: "Validates string and number palindromes in Java.",
    code: `public class Palindrome {
    public static boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left++) != s.charAt(right--)) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        System.out.println(isPalindrome("madam")); // true
        System.out.println(isPalindrome("hello")); // false
    }
}`
  },
  {
    id: "palindrome-c",
    title: "Palindrome Number in C",
    language: "c",
    category: "algorithms",
    tags: ["palindrome", "number", "c"],
    description: "Reverses a number to determine if it is a palindrome.",
    code: `#include <stdio.h>

int main() {
    int n = 1221, reversed = 0, remainder, original;
    original = n;

    while (n != 0) {
        remainder = n % 10;
        reversed = reversed * 10 + remainder;
        n /= 10;
    }

    if (original == reversed)
        printf("%d is a palindrome.\\n", original);
    else
        printf("%d is not a palindrome.\\n", original);
    return 0;
}`
  },

  // --- REVERSE STRING ---
  {
    id: "reverse-string-python",
    title: "Reverse a String in Python",
    language: "python",
    category: "algorithms",
    tags: ["reverse", "reverse string", "string manipulation"],
    description: "Reverses a string using slicing and two-pointer approach.",
    code: `# Method 1: Slicing (Fastest & most idiomatic)
s = "MIT Mysore"
reversed_s = s[::-1]
print(reversed_s)  # erosyM TIM

# Method 2: Two-pointer in-place (character list)
chars = list(s)
left, right = 0, len(chars) - 1
while left < right:
    chars[left], chars[right] = chars[right], chars[left]
    left += 1
    right -= 1
print("".join(chars))`
  },
  {
    id: "reverse-string-java",
    title: "Reverse a String in Java",
    language: "java",
    category: "algorithms",
    tags: ["reverse", "reverse string", "stringbuilder", "java"],
    description: "Reverses a string in Java using StringBuilder and character array.",
    code: `public class ReverseString {
    public static String reverseWithBuilder(String str) {
        return new StringBuilder(str).reverse().toString();
    }

    public static String reverseManually(String str) {
        char[] arr = str.toCharArray();
        int left = 0, right = arr.length - 1;
        while (left < right) {
            char temp = arr[left];
            arr[left++] = arr[right];
            arr[right--] = temp;
        }
        return new String(arr);
    }

    public static void main(String[] args) {
        String original = "Engineering";
        System.out.println("Reversed: " + reverseManually(original));
        // Output: gnireenignE
    }
}`
  },
  {
    id: "reverse-string-c",
    title: "Reverse a String in C",
    language: "c",
    category: "algorithms",
    tags: ["reverse string", "string", "pointers", "c"],
    description: "In-place string reversal using pointers in C.",
    code: `#include <stdio.h>
#include <string.h>

void reverseString(char* str) {
    int i = 0, j = strlen(str) - 1;
    while (i < j) {
        char temp = str[i];
        str[i++] = str[j];
        str[j--] = temp;
    }
}

int main() {
    char s[] = "Navigo";
    reverseString(s);
    printf("Reversed: %s\\n", s); // ogivaN
    return 0;
}`
  },
  {
    id: "reverse-string-js",
    title: "Reverse a String in JavaScript",
    language: "javascript",
    category: "algorithms",
    tags: ["reverse string", "split reverse join", "javascript"],
    description: "Reverses a string in JavaScript using split/reverse/join and reduction.",
    code: `// Method 1: Built-in array methods
const str = "Maharaja";
const reversed = str.split("").reverse().join("");
console.log(reversed); // ajarahM

// Method 2: Reduce
const rev2 = [...str].reduce((acc, char) => char + acc, "");
console.log(rev2);`
  },

  // --- ARMSTRONG NUMBER ---
  {
    id: "armstrong-python",
    title: "Armstrong Number in Python",
    language: "python",
    category: "algorithms",
    tags: ["armstrong", "armstrong number", "math"],
    description: "Checks if the sum of digits raised to the power of digit count equals the number.",
    code: `def is_armstrong(n):
    num_str = str(n)
    power = len(num_str)
    return sum(int(digit) ** power for digit in num_str) == n

# 153 = 1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153
print(is_armstrong(153))  # True
print(is_armstrong(370))  # True
print(is_armstrong(123))  # False`
  },
  {
    id: "armstrong-java",
    title: "Armstrong Number in Java",
    language: "java",
    category: "algorithms",
    tags: ["armstrong", "java"],
    description: "Checks if a number is an Armstrong number in Java.",
    code: `public class Armstrong {
    public static boolean checkArmstrong(int n) {
        int original = n, sum = 0;
        int digits = String.valueOf(n).length();
        while (n > 0) {
            int rem = n % 10;
            sum += Math.pow(rem, digits);
            n /= 10;
        }
        return sum == original;
    }

    public static void main(String[] args) {
        System.out.println(checkArmstrong(153)); // true
        System.out.println(checkArmstrong(9474)); // true
    }
}`
  },
  {
    id: "armstrong-c",
    title: "Armstrong Number in C",
    language: "c",
    category: "algorithms",
    tags: ["armstrong", "c"],
    description: "Armstrong number verification in C.",
    code: `#include <stdio.h>
#include <math.h>

int main() {
    int num = 153, original, remainder, n = 0;
    float result = 0.0;

    original = num;
    for (original = num; original != 0; ++n) original /= 10;

    original = num;
    while (original != 0) {
        remainder = original % 10;
        result += pow(remainder, n);
        original /= 10;
    }

    if ((int)result == num)
        printf("%d is an Armstrong number.\\n", num);
    else
        printf("%d is not an Armstrong number.\\n", num);
    return 0;
}`
  },

  // --- SWAP TWO NUMBERS ---
  {
    id: "swap-python",
    title: "Swap Two Numbers in Python",
    language: "python",
    category: "basics",
    tags: ["swap", "swap numbers", "python tuple unpack"],
    description: "Swaps two numbers in Python with tuple unpacking or arithmetic.",
    code: `a = 10
b = 20

# Pythonic tuple unpacking:
a, b = b, a
print(f"a = {a}, b = {b}")  # a = 20, b = 10

# Without extra variable using arithmetic:
a = a + b
b = a - b
a = a - b`
  },
  {
    id: "swap-c",
    title: "Swap Two Numbers without 3rd Variable in C",
    language: "c",
    category: "basics",
    tags: ["swap", "without third variable", "bitwise xor", "c"],
    description: "Swaps two numbers in C using XOR bitwise operators.",
    code: `#include <stdio.h>

int main() {
    int x = 15, y = 25;
    printf("Before: x = %d, y = %d\\n", x, y);

    // Using XOR (no overflow risk)
    x = x ^ y;
    y = x ^ y;
    x = x ^ y;

    printf("After:  x = %d, y = %d\\n", x, y);
    return 0;
}`
  },

  // --- BUBBLE SORT ---
  {
    id: "bubble-sort-python",
    title: "Bubble Sort in Python",
    language: "python",
    category: "sorting",
    tags: ["bubble sort", "sorting", "algorithm"],
    description: "Optimized bubble sort algorithm with early termination flag in Python.",
    code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        # If no two elements were swapped, array is already sorted
        if not swapped:
            break
    return arr

# Example:
data = [64, 34, 25, 12, 22, 11, 90]
print("Sorted array:", bubble_sort(data))
# Output: [11, 12, 22, 25, 34, 64, 90]`
  },
  {
    id: "bubble-sort-java",
    title: "Bubble Sort in Java",
    language: "java",
    category: "sorting",
    tags: ["bubble sort", "sorting", "java"],
    description: "Classic bubble sort implementation on an integer array in Java.",
    code: `public class BubbleSort {
    public static void sort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }

    public static void main(String[] args) {
        int[] arr = {5, 1, 4, 2, 8};
        sort(arr);
        for (int v : arr) System.out.print(v + " ");
    }
}`
  },
  {
    id: "bubble-sort-c",
    title: "Bubble Sort in C",
    language: "c",
    category: "sorting",
    tags: ["bubble sort", "c"],
    description: "Bubble sort routine in C.",
    code: `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {64, 25, 12, 22, 11};
    int n = sizeof(arr) / sizeof(arr[0]);
    bubbleSort(arr, n);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    return 0;
}`
  },

  // --- SELECTION SORT ---
  {
    id: "selection-sort-python",
    title: "Selection Sort in Python",
    language: "python",
    category: "sorting",
    tags: ["selection sort", "sorting", "minimum"],
    description: "Finds the minimum element from unsorted part and swaps it to the front.",
    code: `def selection_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr

print(selection_sort([29, 10, 14, 37, 13]))
# Output: [10, 13, 14, 29, 37]`
  },
  {
    id: "selection-sort-c",
    title: "Selection Sort in C",
    language: "c",
    category: "sorting",
    tags: ["selection sort", "c"],
    description: "Selection sort in C with pointer swap.",
    code: `#include <stdio.h>

void selectionSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min_idx]) min_idx = j;
        }
        int temp = arr[min_idx];
        arr[min_idx] = arr[i];
        arr[i] = temp;
    }
}

int main() {
    int arr[] = {64, 25, 12, 22, 11};
    selectionSort(arr, 5);
    for (int i = 0; i < 5; i++) printf("%d ", arr[i]);
    return 0;
}`
  },

  // --- INSERTION SORT ---
  {
    id: "insertion-sort-python",
    title: "Insertion Sort in Python",
    language: "python",
    category: "sorting",
    tags: ["insertion sort", "sorting"],
    description: "Builds the sorted array one item at a time by shifting larger elements.",
    code: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and key < arr[j]:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

print(insertion_sort([12, 11, 13, 5, 6]))
# Output: [5, 6, 11, 12, 13]`
  },

  // --- MERGE SORT ---
  {
    id: "merge-sort-python",
    title: "Merge Sort in Python",
    language: "python",
    category: "sorting",
    tags: ["merge sort", "divide and conquer", "o(n log n)"],
    description: "Classic O(n log n) divide-and-conquer merge sort in Python.",
    code: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

print(merge_sort([38, 27, 43, 3, 9, 82, 10]))
# Output: [3, 9, 10, 27, 38, 43, 82]`
  },
  {
    id: "merge-sort-java",
    title: "Merge Sort in Java",
    language: "java",
    category: "sorting",
    tags: ["merge sort", "divide and conquer", "java"],
    description: "Recursive merge sort implementation in Java.",
    code: `public class MergeSort {
    public static void mergeSort(int[] arr, int l, int r) {
        if (l < r) {
            int m = l + (r - l) / 2;
            mergeSort(arr, l, m);
            mergeSort(arr, m + 1, r);
            merge(arr, l, m, r);
        }
    }

    private static void merge(int[] arr, int l, int m, int r) {
        int n1 = m - l + 1, n2 = r - m;
        int[] L = new int[n1];
        int[] R = new int[n2];
        for (int i = 0; i < n1; ++i) L[i] = arr[l + i];
        for (int j = 0; j < n2; ++j) R[j] = arr[m + 1 + j];

        int i = 0, j = 0, k = l;
        while (i < n1 && j < n2) {
            if (L[i] <= R[j]) arr[k++] = L[i++];
            else arr[k++] = R[j++];
        }
        while (i < n1) arr[k++] = L[i++];
        while (j < n2) arr[k++] = R[j++];
    }

    public static void main(String[] args) {
        int[] a = {12, 11, 13, 5, 6, 7};
        mergeSort(a, 0, a.length - 1);
        for (int v : a) System.out.print(v + " ");
    }
}`
  },

  // --- QUICK SORT ---
  {
    id: "quick-sort-python",
    title: "Quick Sort in Python",
    language: "python",
    category: "sorting",
    tags: ["quick sort", "partition", "divide and conquer"],
    description: "Quick sort using list comprehensions and median pivot approach.",
    code: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

print(quick_sort([10, 7, 8, 9, 1, 5]))
# Output: [1, 5, 7, 8, 9, 10]`
  },

  // --- BINARY SEARCH ---
  {
    id: "binary-search-python",
    title: "Binary Search in Python",
    language: "python",
    category: "searching",
    tags: ["binary search", "search", "o(log n)"],
    description: "Iterative binary search algorithm on a sorted list.",
    code: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1

    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid  # Index found
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1  # Target not in list

nums = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
target = 23
idx = binary_search(nums, target)
print(f"Target {target} found at index {idx}")  # Index 5`
  },
  {
    id: "binary-search-java",
    title: "Binary Search in Java",
    language: "java",
    category: "searching",
    tags: ["binary search", "java"],
    description: "Binary search in Java with integer overflow safe mid calculation.",
    code: `public class BinarySearch {
    public static int search(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] nums = {10, 20, 30, 40, 50};
        System.out.println("Index of 30: " + search(nums, 30)); // 2
    }
}`
  },
  {
    id: "binary-search-c",
    title: "Binary Search in C",
    language: "c",
    category: "searching",
    tags: ["binary search", "c"],
    description: "Standard binary search implementation in C.",
    code: `#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int arr[] = {2, 3, 4, 10, 40};
    int res = binarySearch(arr, 5, 10);
    printf("Result index: %d\\n", res); // 3
    return 0;
}`
  },

  // --- LINKED LIST ---
  {
    id: "linked-list-python",
    title: "Singly Linked List in Python",
    language: "python",
    category: "data-structures",
    tags: ["linked list", "singly linked list", "node"],
    description: "Singly linked list with insert at end, delete, and traversal methods.",
    code: `class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        curr = self.head
        while curr.next:
            curr = curr.next
        curr.next = new_node

    def display(self):
        elements = []
        curr = self.head
        while curr:
            elements.append(str(curr.data))
            curr = curr.next
        print(" -> ".join(elements) + " -> None")

# Usage:
ll = LinkedList()
ll.append(10)
ll.append(20)
ll.append(30)
ll.display()  # 10 -> 20 -> 30 -> None`
  },
  {
    id: "linked-list-c",
    title: "Singly Linked List in C",
    language: "c",
    category: "data-structures",
    tags: ["linked list", "malloc", "pointers", "c"],
    description: "Node creation, insertion, and traversal using malloc in C.",
    code: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

void printList(struct Node* n) {
    while (n != NULL) {
        printf("%d -> ", n->data);
        n = n->next;
    }
    printf("NULL\\n");
}

int main() {
    struct Node* head = (struct Node*)malloc(sizeof(struct Node));
    struct Node* second = (struct Node*)malloc(sizeof(struct Node));
    struct Node* third = (struct Node*)malloc(sizeof(struct Node));

    head->data = 1;
    head->next = second;

    second->data = 2;
    second->next = third;

    third->data = 3;
    third->next = NULL;

    printList(head); // 1 -> 2 -> 3 -> NULL
    return 0;
}`
  },
  {
    id: "linked-list-java",
    title: "Singly Linked List in Java",
    language: "java",
    category: "data-structures",
    tags: ["linked list", "node", "java"],
    description: "Object-oriented linked list implementation in Java.",
    code: `public class CustomLinkedList {
    static class Node {
        int data;
        Node next;
        Node(int d) { data = d; next = null; }
    }

    Node head;

    public void add(int data) {
        Node newNode = new Node(data);
        if (head == null) { head = newNode; return; }
        Node temp = head;
        while (temp.next != null) temp = temp.next;
        temp.next = newNode;
    }

    public void print() {
        Node curr = head;
        while (curr != null) {
            System.out.print(curr.data + " -> ");
            curr = curr.next;
        }
        System.out.println("null");
    }

    public static void main(String[] args) {
        CustomLinkedList list = new CustomLinkedList();
        list.add(10); list.add(20); list.add(30);
        list.print();
    }
}`
  },

  // --- STACK ---
  {
    id: "stack-python",
    title: "Stack Implementation in Python",
    language: "python",
    category: "data-structures",
    tags: ["stack", "lifo", "push", "pop"],
    description: "LIFO stack implementation with push, pop, peek, and is_empty methods.",
    code: `class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if not self.is_empty():
            return self.items.pop()
        raise IndexError("pop from empty stack")

    def peek(self):
        if not self.is_empty():
            return self.items[-1]
        return None

    def is_empty(self):
        return len(self.items) == 0

s = Stack()
s.push(10)
s.push(20)
print(s.pop())   # 20
print(s.peek())  # 10`
  },
  {
    id: "stack-c",
    title: "Stack using Array in C",
    language: "c",
    category: "data-structures",
    tags: ["stack", "lifo", "array", "c"],
    description: "Array-based stack in C with overflow and underflow checks.",
    code: `#include <stdio.h>
#define MAX 100

int stack[MAX];
int top = -1;

void push(int x) {
    if (top >= MAX - 1) {
        printf("Stack Overflow\\n");
        return;
    }
    stack[++top] = x;
}

int pop() {
    if (top < 0) {
        printf("Stack Underflow\\n");
        return -1;
    }
    return stack[top--];
}

int main() {
    push(10);
    push(20);
    printf("Popped: %d\\n", pop()); // 20
    printf("Popped: %d\\n", pop()); // 10
    return 0;
}`
  },

  // --- QUEUE ---
  {
    id: "queue-python",
    title: "Queue Implementation in Python",
    language: "python",
    category: "data-structures",
    tags: ["queue", "fifo", "collections.deque"],
    description: "FIFO Queue implementation in Python using collections.deque.",
    code: `from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()

    def enqueue(self, item):
        self.items.append(item)

    def dequeue(self):
        if not self.is_empty():
            return self.items.popleft()
        raise IndexError("dequeue from empty queue")

    def is_empty(self):
        return len(self.items) == 0

q = Queue()
q.enqueue("Customer 1")
q.enqueue("Customer 2")
print(q.dequeue())  # Customer 1`
  },
  {
    id: "queue-c",
    title: "Queue using Array in C",
    language: "c",
    category: "data-structures",
    tags: ["queue", "fifo", "c"],
    description: "Linear queue with front and rear pointers in C.",
    code: `#include <stdio.h>
#define SIZE 5

int items[SIZE], front = -1, rear = -1;

void enQueue(int value) {
    if (rear == SIZE - 1) {
        printf("Queue is Full!\\n");
        return;
    }
    if (front == -1) front = 0;
    items[++rear] = value;
}

int deQueue() {
    if (front == -1 || front > rear) {
        printf("Queue is Empty!\\n");
        return -1;
    }
    return items[front++];
}

int main() {
    enQueue(10);
    enQueue(20);
    printf("Dequeued: %d\\n", deQueue()); // 10
    return 0;
}`
  },

  // --- BINARY TREE TRAVERSAL ---
  {
    id: "tree-traversal-python",
    title: "Binary Tree Traversals in Python",
    language: "python",
    category: "data-structures",
    tags: ["tree", "binary tree", "inorder", "preorder", "postorder"],
    description: "Inorder (LNR), Preorder (NLR), and Postorder (LRN) tree traversals.",
    code: `class TreeNode:
    def __init__(self, val=0):
        self.val = val
        self.left = None
        self.right = None

def inorder(root):
    return inorder(root.left) + [root.val] + inorder(root.right) if root else []

def preorder(root):
    return [root.val] + preorder(root.left) + preorder(root.right) if root else []

def postorder(root):
    return postorder(root.left) + postorder(root.right) + [root.val] if root else []

#       1
#      / \\
#     2   3
#    / \\
#   4   5
root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
root.left.right = TreeNode(5)

print("Inorder:  ", inorder(root))    # [4, 2, 5, 1, 3]
print("Preorder: ", preorder(root))   # [1, 2, 4, 5, 3]
print("Postorder:", postorder(root))  # [4, 5, 2, 3, 1]`
  },
  {
    id: "bst-python",
    title: "Binary Search Tree (BST) in Python",
    language: "python",
    category: "data-structures",
    tags: ["bst", "binary search tree", "insert", "search"],
    description: "Binary search tree insert and lookup methods in Python.",
    code: `class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

def insert(root, key):
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root

def search(root, key):
    if root is None or root.key == key:
        return root
    if key < root.key:
        return search(root.left, key)
    return search(root.right, key)

r = None
for val in [50, 30, 20, 40, 70, 60, 80]:
    r = insert(r, val)

print("Found 40:", search(r, 40) is not None)  # True
print("Found 99:", search(r, 99) is not None)  # False`
  },

  // --- OOP BASICS ---
  {
    id: "oop-class-python",
    title: "Class and Object in Python",
    language: "python",
    category: "oop",
    tags: ["class", "object", "oop", "init", "self"],
    description: "Defines a class with attributes, methods, and instance instantiation in Python.",
    code: `class Student:
    # Class attribute
    college = "Maharaja Institute of Technology Mysore"

    def __init__(self, name, usn, branch):
        # Instance attributes
        self.name = name
        self.usn = usn
        self.branch = branch

    def display(self):
        return f"{self.name} ({self.usn}) - {self.branch} at {self.college}"

# Instantiate:
s1 = Student("Arya", "4MH21CS001", "CSE")
print(s1.display())`
  },
  {
    id: "oop-inheritance-python",
    title: "Inheritance in Python",
    language: "python",
    category: "oop",
    tags: ["inheritance", "oop", "super", "polymorphism"],
    description: "Single and multilevel inheritance demonstrating super() method.",
    code: `class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def introduce(self):
        return f"Hi, I am {self.name}, age {self.age}."

class EngineeringStudent(Person):
    def __init__(self, name, age, usn, branch):
        super().__init__(name, age)
        self.usn = usn
        self.branch = branch

    def introduce(self):
        base_intro = super().introduce()
        return f"{base_intro} I study {self.branch} (USN: {self.usn})."

student = EngineeringStudent("Kavya", 20, "4MH21IS042", "ISE")
print(student.introduce())`
  },
  {
    id: "oop-polymorphism-java",
    title: "Method Overriding (Runtime Polymorphism) in Java",
    language: "java",
    category: "oop",
    tags: ["polymorphism", "method overriding", "dynamic dispatch", "java"],
    description: "Runtime polymorphism using superclass reference and overridden methods.",
    code: `class Animal {
    void sound() {
        System.out.println("Animal makes a generic sound");
    }
}

class Dog extends Animal {
    @Override
    void sound() {
        System.out.println("Dog barks: Woof Woof!");
    }
}

class Cat extends Animal {
    @Override
    void sound() {
        System.out.println("Cat meows: Meow!");
    }
}

public class Main {
    public static void main(String[] args) {
        Animal myAnimal; // Superclass reference
        myAnimal = new Dog();
        myAnimal.sound(); // Output: Dog barks: Woof Woof!

        myAnimal = new Cat();
        myAnimal.sound(); // Output: Cat meows: Meow!
    }
}`
  },
  {
    id: "oop-overloading-java",
    title: "Method Overloading (Compile-time Polymorphism) in Java",
    language: "java",
    category: "oop",
    tags: ["overloading", "polymorphism", "compile-time", "java"],
    description: "Method overloading by changing parameter count and types.",
    code: `public class Calculator {
    // Overloaded add method with 2 ints
    public int add(int a, int b) {
        return a + b;
    }

    // Overloaded add method with 3 ints
    public int add(int a, int b, int c) {
        return a + b + c;
    }

    // Overloaded add method with 2 doubles
    public double add(double a, double b) {
        return a + b;
    }

    public static void main(String[] args) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(2, 3));       // 5
        System.out.println(calc.add(2, 3, 4));    // 9
        System.out.println(calc.add(2.5, 3.5));   // 6.0
    }
}`
  },
  {
    id: "oop-encapsulation-java",
    title: "Encapsulation with Getters & Setters in Java",
    language: "java",
    category: "oop",
    tags: ["encapsulation", "data hiding", "getters setters", "java"],
    description: "Private instance variables with public getter and setter validation.",
    code: `public class BankAccount {
    private String accountNumber;
    private double balance;

    public BankAccount(String accNo, double initialBalance) {
        this.accountNumber = accNo;
        this.balance = initialBalance >= 0 ? initialBalance : 0;
    }

    public double getBalance() {
        return this.balance;
    }

    public void deposit(double amount) {
        if (amount > 0) this.balance += amount;
    }

    public boolean withdraw(double amount) {
        if (amount > 0 && amount <= this.balance) {
            this.balance -= amount;
            return true;
        }
        return false;
    }
}`
  },
  {
    id: "oop-interface-java",
    title: "Interface and Abstract Class in Java",
    language: "java",
    category: "oop",
    tags: ["interface", "abstract class", "multiple inheritance", "java"],
    description: "Defines contracts using Java interfaces and partial implementations.",
    code: `interface Drivable {
    void accelerate();
    void brake();
}

abstract class Vehicle implements Drivable {
    String brand;
    Vehicle(String b) { this.brand = b; }
    void honk() { System.out.println("Beep beep!"); }
}

class Car extends Vehicle {
    Car(String b) { super(b); }
    public void accelerate() { System.out.println(brand + " accelerating"); }
    public void brake() { System.out.println(brand + " braking"); }
}`
  },

  // --- FILE HANDLING ---
  {
    id: "file-handling-python",
    title: "File Read & Write in Python",
    language: "python",
    category: "file-io",
    tags: ["file handling", "read file", "write file", "open with"],
    description: "Reading, writing, and appending files safely using Python's with context manager.",
    code: `# 1. Write text to a file
with open("sample.txt", "w", encoding="utf-8") as f:
    f.write("Line 1: MITM Navigo\\nLine 2: Indoor Navigation\\n")

# 2. Append text to the file
with open("sample.txt", "a", encoding="utf-8") as f:
    f.write("Line 3: Srirangapatna, Mandya\\n")

# 3. Read entire file
with open("sample.txt", "r", encoding="utf-8") as f:
    content = f.read()
    print("Content:\\n", content)

# 4. Read line-by-line
with open("sample.txt", "r", encoding="utf-8") as f:
    for line in f:
        print("Line:", line.strip())`
  },
  {
    id: "file-handling-c",
    title: "File Handling in C (fopen, fread, fwrite)",
    language: "c",
    category: "file-io",
    tags: ["file handling", "fopen", "fprintf", "fscanf", "c"],
    description: "Opening, writing, reading, and closing files in C.",
    code: `#include <stdio.h>

int main() {
    FILE *fp;
    char buffer[255];

    // Write to file
    fp = fopen("test.txt", "w");
    if (fp == NULL) return 1;
    fprintf(fp, "Maharaja Institute of Technology\\n");
    fclose(fp);

    // Read from file
    fp = fopen("test.txt", "r");
    if (fp == NULL) return 1;
    while (fgets(buffer, 255, fp) != NULL) {
        printf("%s", buffer);
    }
    fclose(fp);
    return 0;
}`
  },

  // --- EXCEPTION HANDLING ---
  {
    id: "exception-handling-python",
    title: "Exception Handling in Python",
    language: "python",
    category: "exceptions",
    tags: ["exception handling", "try except", "finally", "raise"],
    description: "Handling runtime errors with try, except, else, finally blocks.",
    code: `def safe_divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("Error: Cannot divide by zero!")
        return None
    except TypeError:
        print("Error: Both inputs must be numeric.")
        return None
    else:
        print("Division successful.")
        return result
    finally:
        print("Cleanup operations finished.")

print(safe_divide(10, 2))
print(safe_divide(10, 0))`
  },
  {
    id: "exception-handling-java",
    title: "Exception Handling in Java",
    language: "java",
    category: "exceptions",
    tags: ["exception handling", "try catch", "finally", "java"],
    description: "Try, catch, multi-catch, and finally block error handling in Java.",
    code: `public class ExceptionDemo {
    public static void main(String[] args) {
        try {
            int[] arr = {1, 2, 3};
            System.out.println(arr[5]); // ArrayIndexOutOfBoundsException
        } catch (ArrayIndexOutOfBoundsException e) {
            System.err.println("Index error caught: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("General error: " + e.getMessage());
        } finally {
            System.out.println("Finally block always executes.");
        }
    }
}`
  },

  // --- SQL QUERIES ---
  {
    id: "sql-inner-join",
    title: "SQL INNER JOIN Example",
    language: "sql",
    category: "database",
    tags: ["sql", "join", "inner join", "sql join", "database"],
    description: "Combines records from two tables that have matching values in both tables.",
    code: `-- INNER JOIN: Returns rows when there is a match in both tables
SELECT 
    students.usn,
    students.name,
    departments.dept_name,
    departments.building_block
FROM students
INNER JOIN departments 
    ON students.dept_id = departments.dept_id
WHERE students.semester = 6
ORDER BY students.name ASC;`
  },
  {
    id: "sql-left-join",
    title: "SQL LEFT JOIN Example",
    language: "sql",
    category: "database",
    tags: ["sql", "left join", "left outer join"],
    description: "Returns all records from the left table and matched records from the right table.",
    code: `-- LEFT JOIN: Returns all students and their library borrow records (if any)
SELECT 
    s.usn,
    s.name,
    b.book_title,
    b.borrow_date
FROM students s
LEFT JOIN book_loans b 
    ON s.usn = b.student_usn;`
  },
  {
    id: "sql-group-by-having",
    title: "SQL GROUP BY & HAVING Clause",
    language: "sql",
    category: "database",
    tags: ["sql", "group by", "having", "aggregate", "count"],
    description: "Groups rows sharing a property and filters aggregated groups with HAVING.",
    code: `-- Find departments with more than 50 enrolled students
SELECT 
    dept_name,
    COUNT(student_id) AS total_students,
    AVG(cgpa) AS avg_cgpa
FROM students
GROUP BY dept_name
HAVING COUNT(student_id) > 50
ORDER BY avg_cgpa DESC;`
  },
  {
    id: "sql-subquery",
    title: "SQL Subquery Example",
    language: "sql",
    category: "database",
    tags: ["sql", "subquery", "nested query"],
    description: "Subquery nested inside a WHERE clause to filter records.",
    code: `-- Find all students whose CGPA is higher than the department average
SELECT name, branch, cgpa
FROM students s
WHERE cgpa > (
    SELECT AVG(cgpa)
    FROM students
    WHERE branch = s.branch
);`
  },
  {
    id: "sql-create-table",
    title: "SQL CREATE TABLE & Constraints",
    language: "sql",
    category: "database",
    tags: ["sql", "create table", "primary key", "foreign key"],
    description: "Creates relational tables with primary keys, foreign keys, and constraints.",
    code: `CREATE TABLE rooms (
    room_id VARCHAR(20) PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    college_block VARCHAR(50) NOT NULL,
    floor_level VARCHAR(30) NOT NULL,
    capacity INT CHECK (capacity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
  },

  // --- JAVASCRIPT & WEB ---
  {
    id: "let-vs-var-vs-const",
    title: "Difference between let, var, and const in JavaScript",
    language: "javascript",
    category: "javascript",
    tags: ["let vs var", "difference between let and var", "var", "let", "const", "scope", "hoisting"],
    description: "Explains scope (function vs block), hoisting, and reassignment differences.",
    code: `// 1. var: Function-scoped, hoisted with undefined, allows redeclaration
var x = 10;
if (true) {
    var x = 20; // overwrites outer x!
}
console.log(x); // 20

// 2. let: Block-scoped, temporal dead zone, no redeclaration
let y = 10;
if (true) {
    let y = 20; // distinct inner variable
}
console.log(y); // 10

// 3. const: Block-scoped, cannot be reassigned (mutations on objects still allowed)
const PI = 3.14159;
// PI = 3.14; // TypeError: Assignment to constant variable`
  },
  {
    id: "fetch-api-javascript",
    title: "Fetch API with async/await in JavaScript",
    language: "javascript",
    category: "javascript",
    tags: ["fetch", "async await", "api call", "json", "promises"],
    description: "Modern asynchronous API fetching with error handling in JavaScript.",
    code: `async function fetchCampusData() {
    try {
        const response = await fetch("campus-data.json");
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        const data = await response.json();
        console.log("Loaded blocks:", data.blocks.length);
        return data;
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}`
  },
  {
    id: "array-methods-javascript",
    title: "JavaScript Array Methods (map, filter, reduce)",
    language: "javascript",
    category: "javascript",
    tags: ["map", "filter", "reduce", "array methods"],
    description: "Functional array processing examples using map, filter, and reduce.",
    code: `const numbers = [1, 2, 3, 4, 5, 6];

// 1. filter: select even numbers
const evens = numbers.filter(n => n % 2 === 0); // [2, 4, 6]

// 2. map: double every number
const doubled = numbers.map(n => n * 2);        // [2, 4, 6, 8, 10, 12]

// 3. reduce: calculate sum
const total = numbers.reduce((sum, n) => sum + n, 0); // 21`
  },
  {
    id: "css-flexbox-center",
    title: "CSS Flexbox Perfect Centering",
    language: "css",
    category: "web",
    tags: ["flexbox", "center", "css", "layout"],
    description: "Perfect horizontal and vertical centering using CSS flexbox.",
    code: `.center-container {
    display: flex;
    justify-content: center; /* Horizontal alignment */
    align-items: center;     /* Vertical alignment */
    min-height: 100vh;
}`
  },
  {
    id: "css-grid-responsive",
    title: "CSS Grid Responsive Auto-Fit",
    language: "css",
    category: "web",
    tags: ["grid", "css grid", "responsive", "auto-fit"],
    description: "Fluid responsive card grid with no media queries required.",
    code: `.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    padding: 1rem;
}`
  }
];

// Add extra variations to reach 80+ snippets covering all core topics
const additionalSnippets = [
  {
    id: "gcd-lcm-python",
    title: "GCD and LCM in Python",
    language: "python",
    category: "math",
    tags: ["gcd", "lcm", "euclidean algorithm", "math"],
    description: "Calculates Greatest Common Divisor and Least Common Multiple using Euclidean algorithm.",
    code: `import math

def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    return abs(a * b) // gcd(a, b)

print("GCD(48, 18) =", gcd(48, 18))  # 6
print("LCM(48, 18) =", lcm(48, 18))  # 144`
  },
  {
    id: "gcd-lcm-c",
    title: "GCD and LCM in C",
    language: "c",
    category: "math",
    tags: ["gcd", "lcm", "c"],
    description: "Euclidean algorithm for GCD and LCM in C.",
    code: `#include <stdio.h>

int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);
}

int lcm(int a, int b) {
    return (a * b) / gcd(a, b);
}

int main() {
    printf("GCD: %d, LCM: %d\\n", gcd(24, 36), lcm(24, 36));
    return 0;
}`
  },
  {
    id: "sum-of-digits-python",
    title: "Sum of Digits in Python",
    language: "python",
    category: "algorithms",
    tags: ["sum of digits", "digits", "math"],
    description: "Computes the sum of all digits in an integer.",
    code: `def sum_of_digits(n):
    total = 0
    while n > 0:
        total += n % 10
        n //= 10
    return total

print(sum_of_digits(12345))  # 15`
  },
  {
    id: "sum-of-digits-c",
    title: "Sum of Digits in C",
    language: "c",
    category: "algorithms",
    tags: ["sum of digits", "c"],
    description: "Calculates sum of digits using modulo and division in C.",
    code: `#include <stdio.h>

int main() {
    int n = 4567, sum = 0;
    while (n != 0) {
        sum += n % 10;
        n /= 10;
    }
    printf("Sum of digits = %d\\n", sum); // 22
    return 0;
}`
  },
  {
    id: "leap-year-c",
    title: "Leap Year Program in C",
    language: "c",
    category: "basics",
    tags: ["leap year", "conditional", "c"],
    description: "Determines if a given year is a leap year using standard divisibility rules.",
    code: `#include <stdio.h>

int main() {
    int year = 2024;
    if ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0))
        printf("%d is a leap year.\\n", year);
    else
        printf("%d is not a leap year.\\n", year);
    return 0;
}`
  },
  {
    id: "linear-search-c",
    title: "Linear Search in C",
    language: "c",
    category: "searching",
    tags: ["linear search", "searching", "c"],
    description: "Sequential search through an array in C.",
    code: `#include <stdio.h>

int linearSearch(int arr[], int n, int key) {
    for (int i = 0; i < n; i++) {
        if (arr[i] == key) return i;
    }
    return -1;
}

int main() {
    int a[] = {10, 50, 30, 70, 80};
    printf("Found at: %d\\n", linearSearch(a, 5, 30)); // 2
    return 0;
}`
  },
  {
    id: "matrix-multiplication-c",
    title: "Matrix Multiplication in C",
    language: "c",
    category: "algorithms",
    tags: ["matrix", "matrix multiplication", "2d array", "c"],
    description: "Multiplies two 2D matrices in C with dimension compatibility checks.",
    code: `#include <stdio.h>

int main() {
    int a[2][2] = {{1, 2}, {3, 4}};
    int b[2][2] = {{5, 6}, {7, 8}};
    int c[2][2] = {0};

    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 2; j++) {
            for (int k = 0; k < 2; k++) {
                c[i][j] += a[i][k] * b[k][j];
            }
            printf("%d ", c[i][j]);
        }
        printf("\\n");
    }
    return 0;
}`
  },
  {
    id: "matrix-transpose-python",
    title: "Matrix Transpose in Python",
    language: "python",
    category: "algorithms",
    tags: ["matrix", "transpose", "python"],
    description: "Transposes a 2D matrix using list comprehension or zip.",
    code: `matrix = [
    [1, 2, 3],
    [4, 5, 6]
]

# Using zip unpacking
transpose = [list(row) for row in zip(*matrix)]
print(transpose)
# Output: [[1, 4], [2, 5], [3, 6]]`
  },
  {
    id: "circular-queue-c",
    title: "Circular Queue in C",
    language: "c",
    category: "data-structures",
    tags: ["circular queue", "queue", "modulo", "c"],
    description: "Circular queue implementation using modulo indexing in C.",
    code: `#include <stdio.h>
#define SIZE 5

int queue[SIZE];
int front = -1, rear = -1;

int isFull() {
    return (front == (rear + 1) % SIZE);
}

int isEmpty() {
    return (front == -1);
}

void enqueue(int item) {
    if (isFull()) {
        printf("Queue Full!\\n");
        return;
    }
    if (front == -1) front = 0;
    rear = (rear + 1) % SIZE;
    queue[rear] = item;
}

int dequeue() {
    if (isEmpty()) return -1;
    int item = queue[front];
    if (front == rear) front = rear = -1;
    else front = (front + 1) % SIZE;
    return item;
}`
  },
  {
    id: "depth-first-search-python",
    title: "Depth First Search (DFS) in Python",
    language: "python",
    category: "graph",
    tags: ["dfs", "depth first search", "graph", "recursion"],
    description: "Graph traversal using Depth First Search (DFS) in Python.",
    code: `def dfs(graph, start, visited=None):
    if visited is None:
        visited = set()
    visited.add(start)
    print(start, end=" ")

    for neighbor in graph.get(start, []):
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    return visited

# Example graph represented as adjacency list
graph = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': [],
    'E': ['F'],
    'F': []
}
dfs(graph, 'A') # Output: A B D E F C`
  },
  {
    id: "breadth-first-search-python",
    title: "Breadth First Search (BFS) in Python",
    language: "python",
    category: "graph",
    tags: ["bfs", "breadth first search", "graph", "queue"],
    description: "Level-order graph traversal using Breadth First Search (BFS) in Python.",
    code: `from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])

    while queue:
        vertex = queue.popleft()
        print(vertex, end=" ")

        for neighbor in graph.get(vertex, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

graph = {'A': ['B', 'C'], 'B': ['D'], 'C': ['E'], 'D': [], 'E': []}
bfs(graph, 'A') # Output: A B C D E`
  },
  {
    id: "dijkstra-algorithm-python",
    title: "Dijkstra's Shortest Path Algorithm in Python",
    language: "python",
    category: "graph",
    tags: ["dijkstra", "shortest path", "heapq", "greedy"],
    description: "Computes single-source shortest paths on weighted graphs using a min-heap.",
    code: `import heapq

def dijkstra(graph, start):
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    pq = [(0, start)]

    while pq:
        curr_dist, curr_node = heapq.heappop(pq)
        if curr_dist > distances[curr_node]:
            continue

        for neighbor, weight in graph[curr_node].items():
            distance = curr_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(pq, (distance, neighbor))
    return distances

graph = {
    'A': {'B': 4, 'C': 2},
    'B': {'A': 4, 'C': 1, 'D': 5},
    'C': {'A': 2, 'B': 1, 'D': 8},
    'D': {'B': 5, 'C': 8}
}
print(dijkstra(graph, 'A'))`
  },
  {
    id: "sql-aggregate-functions",
    title: "SQL Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)",
    language: "sql",
    category: "database",
    tags: ["sql", "aggregate", "count", "sum", "avg", "min", "max"],
    description: "Standard SQL aggregate functions for summary reporting.",
    code: `SELECT 
    COUNT(*) AS total_students,
    AVG(marks) AS average_marks,
    MAX(marks) AS highest_marks,
    MIN(marks) AS lowest_marks,
    SUM(fee_paid) AS total_collection
FROM student_records;`
  },
  {
    id: "sql-crud-operations",
    title: "SQL CRUD Operations (Insert, Select, Update, Delete)",
    language: "sql",
    category: "database",
    tags: ["sql", "crud", "insert", "update", "delete", "select"],
    description: "Fundamental data manipulation operations in SQL.",
    code: `-- 1. CREATE (Insert)
INSERT INTO faculties (name, dept, designation)
VALUES ('Dr. Sharma', 'CSE', 'Professor');

-- 2. READ (Select)
SELECT * FROM faculties WHERE dept = 'CSE';

-- 3. UPDATE
UPDATE faculties 
SET designation = 'HOD' 
WHERE name = 'Dr. Sharma';

-- 4. DELETE
DELETE FROM faculties WHERE id = 101;`
  },
  {
    id: "localstorage-helper-js",
    title: "LocalStorage Helper in JavaScript",
    language: "javascript",
    category: "javascript",
    tags: ["localstorage", "json", "caching", "javascript"],
    description: "Safe LocalStorage wrapper with automatic JSON serialization and expiry.",
    code: `const Storage = {
    set(key, value, ttlSeconds = 86400) {
        const item = {
            value: value,
            expiry: Date.now() + ttlSeconds * 1000
        };
        try {
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e) {
            console.warn("Storage quota exceeded", e);
        }
    },
    get(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            const item = JSON.parse(raw);
            if (Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            return item.value;
        } catch (e) {
            return null;
        }
    }
};`
  },
  {
    id: "debounce-throttle-js",
    title: "Debounce Function in JavaScript",
    language: "javascript",
    category: "javascript",
    tags: ["debounce", "performance", "timing", "javascript"],
    description: "Debounce function to delay execution until user stops typing.",
    code: `function debounce(func, waitMs = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, waitMs);
    };
}

// Example usage:
const handleSearch = debounce((query) => {
    console.log("Searching for:", query);
}, 300);`
  },
  {
    id: "string-anagram-python",
    title: "Anagram Check in Python",
    language: "python",
    category: "algorithms",
    tags: ["anagram", "string", "hashmap", "python"],
    description: "Checks if two strings are anagrams using character frequency counters.",
    code: `from collections import Counter

def is_anagram(s1, s2):
    return Counter(s1.lower().replace(" ", "")) == Counter(s2.lower().replace(" ", ""))

print(is_anagram("listen", "silent"))  # True
print(is_anagram("triangle", "integral"))  # True
print(is_anagram("apple", "pale"))  # False`
  },
  {
    id: "two-sum-python",
    title: "Two Sum Problem in Python",
    language: "python",
    category: "algorithms",
    tags: ["two sum", "hash map", "leetcode", "o(n)"],
    description: "Finds two indices that add up to target in O(n) time using a dictionary.",
    code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

print(two_sum([2, 7, 11, 15], 9))  # [0, 1]`
  },
  {
    id: "valid-parentheses-python",
    title: "Valid Parentheses (Bracket Matching) in Python",
    language: "python",
    category: "algorithms",
    tags: ["parentheses", "stack", "brackets"],
    description: "Verifies if bracket combinations (), {}, [] are properly closed and ordered.",
    code: `def is_valid_parentheses(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

print(is_valid_parentheses("{[()]}"))  # True
print(is_valid_parentheses("{[(])}"))  # False`
  },
  {
    id: "longest-common-prefix-python",
    title: "Longest Common Prefix in Python",
    language: "python",
    category: "algorithms",
    tags: ["string", "prefix", "python"],
    description: "Finds the longest common prefix string amongst an array of strings.",
    code: `def longest_common_prefix(strs):
    if not strs:
        return ""
    prefix = strs[0]
    for s in strs[1:]:
        while not s.startswith(prefix):
            prefix = prefix[:-1]
            if not prefix:
                return ""
    return prefix

print(longest_common_prefix(["flower", "flow", "flight"]))  # "fl"`
  },
  {
    id: "c-pointers-basics",
    title: "Pointers and Memory Addresses in C",
    language: "c",
    category: "basics",
    tags: ["pointers", "memory", "dereferencing", "c"],
    description: "Demonstrates pointer declaration, address operator &, and dereference operator *.",
    code: `#include <stdio.h>

int main() {
    int var = 20;
    int *ptr = &var; // ptr stores address of var

    printf("Value of var: %d\\n", var);
    printf("Address of var: %p\\n", (void*)&var);
    printf("Pointer value: %p\\n", (void*)ptr);
    printf("Value pointed to (*ptr): %d\\n", *ptr);

    // Modify through pointer
    *ptr = 50;
    printf("New value of var: %d\\n", var); // 50
    return 0;
}`
  },
  {
    id: "c-dynamic-memory-allocation",
    title: "Dynamic Memory Allocation in C (malloc, free)",
    language: "c",
    category: "basics",
    tags: ["malloc", "calloc", "realloc", "free", "dynamic memory", "c"],
    description: "Allocating and freeing dynamic arrays on the heap in C.",
    code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n = 5;
    int *arr = (int*)malloc(n * sizeof(int));
    if (arr == NULL) {
        printf("Memory allocation failed!\\n");
        return 1;
    }

    for (int i = 0; i < n; i++) arr[i] = (i + 1) * 10;
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);

    free(arr); // Always free allocated memory
    return 0;
}`
  },
  {
    id: "java-multithreading",
    title: "Multithreading using Runnable in Java",
    language: "java",
    category: "concurrency",
    tags: ["threads", "multithreading", "runnable", "java"],
    description: "Creating concurrent background execution threads using Runnable interface.",
    code: `class Worker implements Runnable {
    private String name;
    Worker(String n) { this.name = n; }

    public void run() {
        for (int i = 1; i <= 3; i++) {
            System.out.println(name + " step " + i);
            try { Thread.sleep(200); } catch (InterruptedException e) {}
        }
    }
}

public class ThreadDemo {
    public static void main(String[] args) {
        Thread t1 = new Thread(new Worker("Task-A"));
        Thread t2 = new Thread(new Worker("Task-B"));
        t1.start();
        t2.start();
    }
}`
  },
  {
    id: "python-decorators",
    title: "Function Decorators in Python",
    language: "python",
    category: "advanced",
    tags: ["decorators", "wrapper", "functions", "python"],
    description: "Creating higher-order wrapper functions to log timing and calls.",
    code: `import time
from functools import wraps

def time_it(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start
        print(f"{func.__name__} took {duration:.6f}s")
        return result
    return wrapper

@time_it
def compute():
    return sum(i * i for i in range(100000))

compute()`
  },
  {
    id: "python-generators",
    title: "Generators and yield in Python",
    language: "python",
    category: "advanced",
    tags: ["generators", "yield", "memory efficiency", "python"],
    description: "Memory-efficient lazy sequences with yield.",
    code: `def count_up_to(max_val):
    count = 1
    while count <= max_val:
        yield count
        count += 1

# Consuming values on demand:
counter = count_up_to(5)
for num in counter:
    print(num, end=" ")  # 1 2 3 4 5`
  },
  {
    id: "html-semantic-structure",
    title: "Semantic HTML5 Page Structure",
    language: "html",
    category: "web",
    tags: ["html", "semantic", "seo", "accessibility"],
    description: "Standard accessible semantic HTML5 layout template.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessible Web Page</title>
</head>
<body>
    <header role="banner">
        <nav aria-label="Main Navigation">
            <a href="/">Home</a>
        </nav>
    </header>
    <main role="main">
        <article>
            <h1>Campus Navigation</h1>
            <p>Indoor corridor directions.</p>
        </article>
    </main>
    <footer role="contentinfo">
        <p>&copy; 2026 MIT Mysore</p>
    </footer>
</body>
</html>`
  },
  {
    id: "react-usestate-useeffect",
    title: "React useState & useEffect Example",
    language: "javascript",
    category: "react",
    tags: ["react", "usestate", "useeffect", "hooks"],
    description: "Core React hooks managing component state and side effects.",
    code: `import React, { useState, useEffect } from 'react';

function CampusCounter() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        document.title = \`Toured \${count} rooms\`;
    }, [count]);

    return (
        <button onClick={() => setCount(prev => prev + 1)}>
            Visited: {count}
        </button>
    );
}`
  }
];

const allSnippets = [...snippets, ...additionalSnippets];

// Duplicate language variants for key algorithms to ensure thorough multi-language coverage
const languages = ['c', 'cpp', 'java', 'python'];
// Let's add more practical student interview programs:
const extraPrograms = [
  { name: "Reverse an Array", key: "reverse-array", py: `def reverse_array(arr):\n    return arr[::-1]`, c: `void reverseArray(int a[], int n) {\n    int l = 0, r = n - 1;\n    while(l < r) {\n        int t = a[l]; a[l++] = a[r]; a[r--] = t;\n    }\n}` },
  { name: "Find Largest and Smallest in Array", key: "min-max-array", py: `def find_min_max(arr):\n    return min(arr), max(arr)`, c: `void findMinMax(int a[], int n, int *min, int *max) {\n    *min = *max = a[0];\n    for(int i = 1; i < n; i++) {\n        if (a[i] < *min) *min = a[i];\n        if (a[i] > *max) *max = a[i];\n    }\n}` },
  { name: "Check Substring in String", key: "substring-search", py: `text = "MIT Mysore Campus"\npattern = "Mysore"\nprint(pattern in text)  # True`, js: `const text = "MIT Mysore Campus";\nconsole.log(text.includes("Mysore")); // true` },
  { name: "Count Vowels and Consonants", key: "count-vowels", py: `def count_vowels(s):\n    vowels = set("aeiouAEIOU")\n    return sum(1 for c in s if c in vowels)`, c: `int countVowels(char s[]) {\n    int count = 0;\n    for(int i = 0; s[i]; i++) {\n        char c = tolower(s[i]);\n        if(c=='a'||c=='e'||c=='i'||c=='o'||c=='u') count++;\n    }\n    return count;\n}` },
  { name: "Merge Two Sorted Arrays", key: "merge-sorted-arrays", py: `def merge_sorted(a, b):\n    i = j = 0\n    res = []\n    while i < len(a) and j < len(b):\n        if a[i] < b[j]:\n            res.append(a[i])\n            i += 1\n        else:\n            res.append(b[j])\n            j += 1\n    return res + a[i:] + b[j:]`, java: `public static int[] merge(int[] a, int[] b) {\n    int[] res = new int[a.length + b.length];\n    int i = 0, j = 0, k = 0;\n    while (i < a.length && j < b.length) {\n        res[k++] = (a[i] <= b[j]) ? a[i++] : b[j++];\n    }\n    while (i < a.length) res[k++] = a[i++];\n    while (j < b.length) res[k++] = b[j++];\n    return res;\n}` },
  { name: "String to Integer (atoi)", key: "string-to-int", py: `val = int("-42")\nprint(val) # -42`, c: `#include <stdlib.h>\nint num = atoi("12345");` },
  { name: "Power of a Number (Pow)", key: "power-calc", py: `def power(base, exp):\n    if exp == 0: return 1\n    half = power(base, exp // 2)\n    return half * half * (base if exp % 2 else 1)`, c: `double power(double b, int e) {\n    if (e == 0) return 1;\n    double h = power(b, e / 2);\n    return h * h * (e % 2 ? b : 1);\n}` },
  { name: "Second Largest Element in Array", key: "second-largest", py: `def second_largest(arr):\n    unique = list(set(arr))\n    if len(unique) < 2: return None\n    unique.sort()\n    return unique[-2]`, java: `public static int getSecondLargest(int[] a) {\n    int first = Integer.MIN_VALUE, second = Integer.MIN_VALUE;\n    for (int n : a) {\n        if (n > first) { second = first; first = n; }\n        else if (n > second && n != first) { second = n; }\n    }\n    return second;\n}` },
  { name: "Check if Number is Power of Two", key: "power-of-two", py: `def is_power_of_two(n):\n    return n > 0 and (n & (n - 1)) == 0`, c: `int isPowerOfTwo(int n) {\n    return n > 0 && (n & (n - 1)) == 0;\n}` },
  { name: "Remove Duplicates from List / Array", key: "remove-duplicates", py: `def remove_duplicates(lst):\n    return list(dict.fromkeys(lst))\nprint(remove_duplicates([1, 2, 2, 3, 4, 4, 5])) # [1, 2, 3, 4, 5]`, js: `const nums = [1, 2, 2, 3, 4, 4, 5];\nconst unique = [...new Set(nums)];` },
  { name: "Check Leap Year in Python", key: "leap-year-py", py: `def is_leap_year(year):\n    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)` },
  { name: "Flatten a Nested List in Python", key: "flatten-list-py", py: `def flatten(nested):\n    res = []\n    for item in nested:\n        if isinstance(item, list):\n            res.extend(flatten(item))\n        else:\n            res.append(item)\n    return res\nprint(flatten([1, [2, [3, 4]], 5])) # [1, 2, 3, 4, 5]` },
  { name: "Count Occurrences of Elements in Python", key: "counter-py", py: `from collections import Counter\nwords = ["cse", "ise", "cse", "ece", "cse", "ise"]\nprint(Counter(words)) # {'cse': 3, 'ise': 2, 'ece': 1}` },
  { name: "Simple HTTP Server in Python", key: "http-server-py", py: `# Run in terminal:\n# python -m http.server 8000\nprint("Serving HTTP on port 8000...")` },
  { name: "Binary to Decimal Conversion in Python", key: "bin-to-dec-py", py: `binary_str = "10110"\ndecimal = int(binary_str, 2)\nprint(decimal) # 22` },
  { name: "Decimal to Binary Conversion in Python", key: "dec-to-bin-py", py: `num = 22\nbin_str = bin(num)[2:]\nprint(bin_str) # 10110` },
  { name: "Convert Celsius to Fahrenheit in Python", key: "celsius-fahrenheit-py", py: `def c_to_f(c):\n    return (c * 9/5) + 32\ndef f_to_c(f):\n    return (f - 32) * 5/9\nprint("25 C =", c_to_f(25), "F") # 77.0 F` }
];

extraPrograms.forEach(p => {
  if (p.py) {
    allSnippets.push({
      id: `${p.key}-python`,
      title: `${p.name} in Python`,
      language: "python",
      category: "algorithms",
      tags: [p.name.toLowerCase(), p.key.replace(/-/g, ' '), "python"],
      description: `Implementation of ${p.name.toLowerCase()} in Python.`,
      code: p.py
    });
  }
  if (p.c) {
    allSnippets.push({
      id: `${p.key}-c`,
      title: `${p.name} in C`,
      language: "c",
      category: "algorithms",
      tags: [p.name.toLowerCase(), p.key.replace(/-/g, ' '), "c"],
      description: `Implementation of ${p.name.toLowerCase()} in C.`,
      code: p.c
    });
  }
  if (p.java) {
    allSnippets.push({
      id: `${p.key}-java`,
      title: `${p.name} in Java`,
      language: "java",
      category: "algorithms",
      tags: [p.name.toLowerCase(), p.key.replace(/-/g, ' '), "java"],
      description: `Implementation of ${p.name.toLowerCase()} in Java.`,
      code: p.java
    });
  }
  if (p.js) {
    allSnippets.push({
      id: `${p.key}-js`,
      title: `${p.name} in JavaScript`,
      language: "javascript",
      category: "javascript",
      tags: [p.name.toLowerCase(), p.key.replace(/-/g, ' '), "javascript"],
      description: `Implementation of ${p.name.toLowerCase()} in JavaScript.`,
      code: p.js
    });
  }
});

console.log("Total Snippets generated:", allSnippets.length);
fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/locorom/code-snippets.json', JSON.stringify(allSnippets, null, 2), 'utf8');
console.log("code-snippets.json written successfully!");
