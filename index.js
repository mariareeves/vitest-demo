import { GenericContainer } from "testcontainers";

const container = await new GenericContainer("minio/minio")
    .withExposedPorts(9000)
    .withCommand(["server", "/data"])
    .start();

console.log(`Minio is now running on ${container.getHost()}:${container.getMappedPort(9000)}`);