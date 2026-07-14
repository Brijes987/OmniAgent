import { Kafka, Producer, ProducerRecord } from "kafkajs";

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "omniagent-gateway";

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: [KAFKA_BROKER],
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
  }

  async connect() {
    await this.producer.connect();
    console.log("[KafkaProducer] Connected to Kafka broker");
  }

  async publishTask(
    topic: string,
    payload: {
      executionId: string;
      nodeId: string;
      nodeType: string;
      data: any;
      pipeline: any;
    }
  ) {
    const record: ProducerRecord = {
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
        },
      ],
    };

    await this.producer.send(record);
    console.log(`[KafkaProducer] Published task to topic:", topic);
  }

  async disconnect() {
    await this.producer.disconnect();
  }
}
