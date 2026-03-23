#include <iostream>
#include <vector>
#include <map>
#include <random>
#include <algorithm>
#include <iomanip>
#include <fstream>
#include <string>

/**
 * ADVANCED DSA CONCEPTS:
 * 1. Templates: Generic programming for different dice types.
 * 2. Linked List: Custom Singly Linked List for "Session Highlights".
 * 3. Merge Sort: Divide and Conquer sorting (O(N log N)).
 * 4. Binary Search: Searching in sorted data (O(log N)).
 * 5. Recursion with Memoization: Dynamic Programming for probability calculation.
 * 6. File I/O: Data persistence.
 */

// Custom Linked List Node (DSA)
struct Node {
    int value;
    int dieSides;
    Node* next;
    Node(int val, int sides) : value(val), dieSides(sides), next(nullptr) {}
};

// Custom Singly Linked List (DSA)
class HighlightList {
private:
    Node* head;
public:
    HighlightList() : head(nullptr) {}
    ~HighlightList() {
        while (head) {
            Node* temp = head;
            head = head->next;
            delete temp;
        }
    }

    void addHighlight(int val, int sides) {
        Node* newNode = new Node(val, sides);
        newNode->next = head;
        head = newNode;
    }

    void display() {
        if (!head) {
            std::cout << "No highlights recorded this session.\n";
            return;
        }
        Node* curr = head;
        std::cout << "--- High Rolls (Recent First) ---\n";
        while (curr) {
            std::cout << "[D" << curr->dieSides << ": " << curr->value << "] -> ";
            curr = curr->next;
        }
        std::cout << "NULL\n";
    }

    void clear() {
        while (head) {
            Node* temp = head;
            head = head->next;
            delete temp;
        }
    }
};

// Merge Sort Algorithms (DSA)
void merge(std::vector<int>& arr, int left, int mid, int right) {
    int n1 = mid - left + 1;
    int n2 = right - mid;
    std::vector<int> L(n1), R(n2);
    for (int i = 0; i < n1; i++) L[i] = arr[left + i];
    for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];
    int i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
        if (L[i] <= R[j]) arr[k++] = L[i++];
        else arr[k++] = R[j++];
    }
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];
}

void mergeSort(std::vector<int>& arr, int left, int right) {
    if (left < right) {
        int mid = left + (right - left) / 2;
        mergeSort(arr, left, mid);
        mergeSort(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }
}

// Binary Search for frequency counting (DSA)
int countOccurrences(const std::vector<int>& sortedArr, int target) {
    auto low = std::lower_bound(sortedArr.begin(), sortedArr.end(), target);
    auto high = std::upper_bound(sortedArr.begin(), sortedArr.end(), target);
    return std::distance(low, high);
}

// Recursive Sum Combinations with Memoization (DP/DSA)
std::map<std::pair<int, int>, long long> memo;
long long countWays(int n, int s, int target) {
    if (target < n || target > n * s) return 0;
    if (n == 1) return (target >= 1 && target <= s) ? 1 : 0;
    if (memo.count({n, target})) return memo[{n, target}];

    long long ways = 0;
    for (int i = 1; i <= s; ++i) {
        ways += countWays(n - 1, s, target - i);
    }
    return memo[{n, target}] = ways;
}

class AdvancedSimulator {
private:
    std::vector<int> history;
    HighlightList highlights;
    std::mt19937 gen;
    const std::string filename = "dice_history.txt";

public:
    AdvancedSimulator() : gen(std::random_device{}()) {
        loadHistory();
    }

    void roll(int n, int sides) {
        std::uniform_int_distribution<> dis(1, sides);
        std::cout << "Rolling " << n << " D" << sides << ": ";
        for (int i = 0; i < n; ++i) {
            int result = dis(gen);
            history.push_back(result);
            std::cout << "[" << result << "] ";
            if (result == sides || result >= sides * 0.9) {
                highlights.addHighlight(result, sides);
            }
        }
        std::cout << std::endl;
        saveHistory();
    }

    void displayHistory(bool sorted) {
        if (history.empty()) {
            std::cout << "History is empty.\n";
            return;
        }
        std::vector<int> displayVec = history;
        if (sorted) {
            mergeSort(displayVec, 0, displayVec.size() - 1);
            std::cout << "\n--- Sorted History ---\n";
        } else {
            std::cout << "\n--- Chronological History ---\n";
        }
        for (size_t i = 0; i < displayVec.size(); ++i) {
            std::cout << displayVec[i] << (i == displayVec.size() - 1 ? "" : ", ");
            if ((i + 1) % 15 == 0) std::cout << "\n";
        }
        std::cout << std::endl;
    }

    void searchAndCount() {
        if (history.empty()) return;
        int target;
        std::cout << "Enter face value to search for: ";
        std::cin >> target;
        std::vector<int> sorted = history;
        mergeSort(sorted, 0, sorted.size() - 1);
        int count = countOccurrences(sorted, target);
        std::cout << "Result: Face " << target << " appears " << count << " times (found using Binary Search).\n";
    }

    void probabilityCalculator() {
        int n, s, target;
        std::cout << "Number of dice: "; std::cin >> n;
        std::cout << "Sides per die: "; std::cin >> s;
        std::cout << "Target sum: "; std::cin >> target;

        memo.clear();
        long long ways = countWays(n, s, target);
        double totalWays = std::pow(s, n);
        double probability = (ways / totalWays) * 100.0;

        std::cout << "\n--- Analytical Probability (Recursive DP) ---\n";
        std::cout << "Ways to get sum " << target << ": " << ways << "\n";
        std::cout << "Total possible combinations: " << (long long)totalWays << "\n";
        std::cout << "Probability: " << std::fixed << std::setprecision(4) << probability << "%\n";
    }

    void saveHistory() {
        std::ofstream outFile(filename);
        for (int val : history) outFile << val << " ";
        outFile.close();
    }

    void loadHistory() {
        std::ifstream inFile(filename);
        int val;
        while (inFile >> val) history.push_back(val);
        inFile.close();
    }

    void showHighlights() {
        highlights.display();
    }

    void reset() {
        history.clear();
        highlights.clear();
        std::remove(filename.c_str());
        std::cout << "All data cleared.\n";
    }
};

void menu() {
    std::cout << "\n============================================\n";
    std::cout << "   ADVANCED DSA DICE SIMULATOR (v2.0)\n";
    std::cout << "============================================\n";
    std::cout << "1. Roll Dice (Custom Sides)\n";
    std::cout << "2. View History (Sorted/Unsorted)\n";
    std::cout << "3. Binary Search Frequency Check\n";
    std::cout << "4. View Session Highlights (Linked List)\n";
    std::cout << "5. Probability Sum Calculator (Recursion/DP)\n";
    std::cout << "6. Reset All Data\n";
    std::cout << "0. Exit\n";
    std::cout << "Choice: ";
}

int main() {
    AdvancedSimulator sim;
    int choice;
    do {
        menu();
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(1000, '\n');
            continue;
        }
        switch (choice) {
            case 1: {
                int n, s;
                std::cout << "How many dice? "; std::cin >> n;
                std::cout << "How many sides? (e.g., 6, 20): "; std::cin >> s;
                sim.roll(n, s);
                break;
            }
            case 2: {
                int type;
                std::cout << "1. Chronological\n2. Sorted (Merge Sort)\nChoice: "; std::cin >> type;
                sim.displayHistory(type == 2);
                break;
            }
            case 3: sim.searchAndCount(); break;
            case 4: sim.showHighlights(); break;
            case 5: sim.probabilityCalculator(); break;
            case 6: sim.reset(); break;
            case 0: std::cout << "Goodbye!\n"; break;
        }
    } while (choice != 0);
    return 0;
}
