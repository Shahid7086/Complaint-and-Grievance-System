#include <iostream>
#include <queue>
using namespace std;

struct Order {
    int id;
    int retry = 0;
};

/* Queues */
queue<Order> orderQueue;
queue<Order> deadQueue;

/* Producer */
void produce(int id) {
    orderQueue.push({id, 0});
    cout << "Order " << id << " added to queue\n";
}

/* Consumer */
void consume() {
    while (!orderQueue.empty()) {
        Order o = orderQueue.front();
        orderQueue.pop();

        cout << "Processing Order " << o.id << endl;

        // Simulate failure for even IDs
        if (o.id % 2 == 0 && o.retry < 2) {
            cout << "Failed -> Retry " << o.retry + 1 << endl;
            o.retry++;
            orderQueue.push(o);
        }
        else if (o.id % 2 == 0) {
            cout << "Moved to Dead Letter\n";
            deadQueue.push(o);
        }
        else {
            cout << "Order Completed\n";
        }
    }
}

int main() {

    cout << "=== Async Order Processing ===\n\n";

    // Producer
    for (int i = 1; i <= 5; i++) {
        produce(i);
    }

    cout << "\n--- Processing ---\n";
    consume();

    cout << "\n--- Dead Letter Queue ---\n";
    while (!deadQueue.empty()) {
        cout << "Order " << deadQueue.front().id << " failed permanently\n";
        deadQueue.pop();
    }

    return 0;
}